"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Breadcrumb from "@/components/Breadcrumb";
import HeaderBar from "@/components/HeaderBar";
import { STATUS_MAP } from "@/lib/constants";
import { editorApi } from "@/services/api";

export default function EditorManuscriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReport, setAiReport] = useState<{ content: string; model: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await editorApi.manuscriptDetail(Number(id));
      setDetail(d as Record<string, unknown>);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role === "author") {
      router.push("/");
      return;
    }
    load();
  }, [user, id, router]);

  const runAiReview = async () => {
    if (!id) return;
    setAiReviewLoading(true);
    setAiError(null);
    setAiReport(null);
    try {
      const res = await editorApi.generateAiReview(Number(id));
      setAiReport(res);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setAiReviewLoading(false);
    }
  };

  const runAction = async (actionType: string, comment?: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await editorApi.action(Number(id), { action_type: actionType, comment });
      setRevisionModalOpen(false);
      setRevisionComment("");
      setSuccessMessage("操作成功");
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const manuscript = detail?.manuscript as Record<string, unknown> | undefined;
  const currentVersion = detail?.current_version as Record<string, unknown> | undefined;
  const editorActions = (detail?.editor_actions as unknown[]) || [];
  const status = manuscript?.status as string | undefined;

  if (!user || user.role === "author") return null;

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <HeaderBar />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-sm border border-[#ddd] bg-white p-6 shadow-sm">
          <Breadcrumb items={[{ label: "首页", href: "/" }, { label: "编辑工作台", href: "/editor" }, { label: "稿件详情" }]} />
          <h1 className="mb-6 text-lg font-semibold text-[#333]">稿件详情（编辑）</h1>
          {successMessage && (
            <div className="mb-4 rounded bg-green-50 px-4 py-2 text-sm text-green-800">{successMessage}</div>
          )}
          {loading && <p className="text-[#666]">加载中…</p>}
          {!loading && detail && manuscript && (
            <>
              <dl className="space-y-2 border-b border-[#eee] pb-4">
                <div><dt className="text-sm text-[#666]">稿件编号</dt><dd>{String(manuscript.manuscript_no)}</dd></div>
                <div><dt className="text-sm text-[#666]">标题</dt><dd>{String(manuscript.title)}</dd></div>
                <div><dt className="text-sm text-[#666]">状态</dt><dd><span className="rounded bg-[#eee] px-2 py-0.5 text-sm">{STATUS_MAP[status ?? ""] ?? status}</span></dd></div>
                <div><dt className="text-sm text-[#666]">投稿人 ID</dt><dd>{String(manuscript.submitted_by)}</dd></div>
                {currentVersion && (
                  <div>
                    <dt className="text-sm text-[#666]">当前版本</dt>
                    <dd className="flex items-center gap-2">
                      v{String(currentVersion.version_number)}，{String(currentVersion.file_name_original)}
                      <a href={editorApi.downloadUrl(Number(id), Number(currentVersion.id))} target="_blank" rel="noopener noreferrer" className="text-sm text-[#8B1538] hover:underline">下载</a>
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-4">
                <h2 className="mb-2 text-sm font-medium text-[#333]">操作</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={runAiReview}
                    disabled={aiReviewLoading}
                    className="rounded border border-[#8B1538] bg-[#8B1538]/10 px-3 py-1.5 text-sm text-[#8B1538] hover:bg-[#8B1538]/20 disabled:opacity-50"
                  >
                    {aiReviewLoading ? "生成中…" : "生成 AI 初审报告"}
                  </button>
                  {status !== "revision_requested" && status !== "rejected" && status !== "accepted" && (
                    <button type="button" onClick={() => setRevisionModalOpen(true)} className="rounded border border-[#ccc] px-3 py-1.5 text-sm hover:bg-[#f5f5f5]">退修</button>
                  )}
                  {status !== "rejected" && (
                    <button type="button" onClick={() => setRejectConfirmOpen(true)} disabled={actionLoading} className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100">退稿</button>
                  )}
                  {status !== "accepted" && (
                    <button type="button" onClick={() => runAction("accept")} disabled={actionLoading} className="rounded bg-[#8B1538] px-3 py-1.5 text-sm text-white hover:bg-[#70122e]">录用</button>
                  )}
                </div>
              </div>
              {aiError && (
                <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{aiError}</div>
              )}
              {aiReport && (
                <div className="mt-6 rounded border border-[#eee] bg-[#f5f4f0] p-4">
                  <h2 className="mb-2 text-sm font-medium text-[#333]">AI 初审报告</h2>
                  <p className="mb-2 text-xs text-[#666]">模型：{aiReport.model}</p>
                  <div className="max-h-[480px] overflow-y-auto rounded border border-[#eee] bg-white p-4 text-sm text-[#333] whitespace-pre-wrap font-sans">{aiReport.content}</div>
                </div>
              )}
              {editorActions.length > 0 && (
                <div className="mt-6">
                  <h2 className="mb-2 text-sm font-medium text-[#333]">操作记录</h2>
                  {(editorActions as Record<string, unknown>[]).map((a, i) => (
                    <div key={i} className="mb-2 rounded border border-[#eee] p-3 text-sm">
                      <p>{String(a.action_type)}：{String(a.from_status)} → {String(a.to_status)}</p>
                      {a.comment != null && <p className="mt-1 text-[#555]">{String(a.comment)}</p>}
                      <p className="mt-1 text-xs text-[#666]">{String(a.created_at ?? "").slice(0, 19)}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-6"><Link href="/editor" className="text-[#8B1538] hover:underline">返回列表</Link></p>
            </>
          )}
        </div>
      </main>

      {revisionModalOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-sm border border-[#ddd] bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-medium text-[#333]">退修意见</h2>
            <textarea
              placeholder="请输入退修意见"
              value={revisionComment}
              onChange={(e) => setRevisionComment(e.target.value)}
              rows={5}
              className="w-full rounded border border-[#ccc] px-3 py-2 text-[#333] focus:border-[#8B1538] focus:outline-none focus:ring-1 focus:ring-[#8B1538]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setRevisionModalOpen(false); setRevisionComment(""); }} className="rounded border border-[#ccc] px-3 py-1.5 text-sm hover:bg-[#f5f5f5]">取消</button>
              <button type="button" onClick={() => runAction("revision_request", revisionComment)} disabled={actionLoading} className="rounded bg-[#8B1538] px-3 py-1.5 text-sm text-white hover:bg-[#70122e]">提交退修</button>
            </div>
          </div>
        </div>
      )}

      {rejectConfirmOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-sm border border-[#ddd] bg-white p-6 shadow-lg">
            <p className="mb-4 text-[#333]">确定要退稿吗？此操作将把稿件状态设为「退稿」。</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectConfirmOpen(false)} className="rounded border border-[#ccc] px-3 py-1.5 text-sm hover:bg-[#f5f5f5]">取消</button>
              <button type="button" onClick={() => { setRejectConfirmOpen(false); runAction("reject"); }} disabled={actionLoading} className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">确定退稿</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
