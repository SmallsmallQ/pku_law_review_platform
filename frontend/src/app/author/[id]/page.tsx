"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Breadcrumb from "@/components/Breadcrumb";
import HeaderBar from "@/components/HeaderBar";
import { STATUS_MAP } from "@/lib/constants";
import { manuscriptsApi } from "@/services/api";

interface VersionItem {
  id: number;
  version_number: number;
  file_name_original: string | null;
  word_count: number | null;
  parsed_at: string | null;
  created_at: string;
}

export default function AuthorManuscriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [revisions, setRevisions] = useState<unknown[]>([]);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revisedMessage, setRevisedMessage] = useState(false);

  useEffect(() => {
    if (searchParams.get("revised") === "1") {
      setRevisedMessage(true);
      const t = setTimeout(() => setRevisedMessage(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const [d, rev, ver] = await Promise.all([
          manuscriptsApi.get(Number(id)),
          manuscriptsApi.revisionRequests(Number(id)),
          manuscriptsApi.versions(Number(id)),
        ]);
        setDetail(d as Record<string, unknown>);
        setRevisions((rev as { items: unknown[] }).items);
        setVersions((ver as { items: VersionItem[] }).items);
      } catch {
        setDetail(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, id]);

  if (!user) {
    router.push("/login");
    return null;
  }

  const status = detail?.status as string | undefined;
  const manuscriptNo = detail?.manuscript_no as string | undefined;
  const title = detail?.title as string | undefined;
  const currentVersion = detail?.current_version as Record<string, unknown> | undefined;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <HeaderBar />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-sm border border-[#ddd] bg-white p-6 shadow-sm">
          <Breadcrumb items={[{ label: "首页", href: "/" }, { label: "作者中心", href: "/author" }, { label: "稿件详情" }]} />
          <h1 className="mb-6 text-lg font-semibold text-[#333]">稿件详情</h1>
          {revisedMessage && (
            <div className="mb-4 rounded bg-green-50 px-4 py-2 text-sm text-green-800">修订稿已提交成功</div>
          )}
          {loading && <p className="text-[#666]">加载中…</p>}
          {!loading && detail && (
            <>
              <dl className="space-y-2 border-b border-[#eee] pb-4">
                <div><dt className="text-sm text-[#666]">稿件编号</dt><dd className="font-medium">{manuscriptNo}</dd></div>
                <div><dt className="text-sm text-[#666]">标题</dt><dd className="font-medium">{title}</dd></div>
                <div><dt className="text-sm text-[#666]">状态</dt><dd><span className="rounded bg-[#eee] px-2 py-0.5 text-sm">{STATUS_MAP[status ?? ""] ?? status}</span></dd></div>
                {currentVersion && (
                  <div>
                    <dt className="text-sm text-[#666]">当前版本</dt>
                    <dd className="flex items-center gap-2">
                      v{String(currentVersion.version_number)}，{String(currentVersion.file_name_original)}
                      <a
                        href={manuscriptsApi.downloadUrl(Number(id), Number(currentVersion.id))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#8B1538] hover:underline"
                      >
                        下载
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              {versions.length > 0 && (
                <div className="mt-4">
                  <h2 className="mb-2 text-sm font-medium text-slate-700">历史版本</h2>
                  <ul className="space-y-1 rounded border border-[#eee] p-3 text-sm">
                    {versions.map((v) => (
                      <li key={v.id} className="flex items-center justify-between">
                        <span>v{v.version_number} — {v.file_name_original || "—"}（{v.created_at?.slice(0, 19)}）</span>
                        <a href={manuscriptsApi.downloadUrl(Number(id), v.id)} target="_blank" rel="noopener noreferrer" className="text-[#8B1538] hover:underline">下载</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {revisions.length > 0 && (
                <div className="mt-4">
                  <h2 className="mb-2 text-sm font-medium text-[#333]">退修意见</h2>
                  {(revisions as { comment?: string; created_at?: string }[]).map((r, i) => (
                    <div key={i} className="mb-2 rounded border border-[#eee] p-3 text-sm">
                      <p>{r.comment || "—"}</p>
                      <p className="mt-1 text-xs text-[#666]">{r.created_at?.slice(0, 19)}</p>
                    </div>
                  ))}
                </div>
              )}
              {status === "revision_requested" && (
                <div className="mt-4">
                  <Link href={`/author/${id}/revise`} className="inline-block rounded bg-[#8B1538] px-4 py-2 text-white hover:bg-[#70122e]">上传修订稿</Link>
                </div>
              )}
              <p className="mt-6">
                <Link href="/author" className="text-[#8B1538] hover:underline">返回我的稿件</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
