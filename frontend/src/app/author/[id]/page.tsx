"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Breadcrumb, Button, Card, Descriptions, List, Space, Spin, Tag, Typography } from "antd";
import type { BreadcrumbItemType } from "antd/es/breadcrumb/Breadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { STATUS_MAP } from "@/lib/constants";
import { manuscriptsApi } from "@/services/api";

interface VersionItem {
  id: number;
  version_number: number;
  file_name_original: string | null;
  created_at: string;
}

export default function AuthorManuscriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [revisions, setRevisions] = useState<{ comment?: string; created_at?: string }[]>([]);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
      setLoadError(null);
      try {
        const [d, rev, ver] = await Promise.all([
          manuscriptsApi.get(Number(id)),
          manuscriptsApi.revisionRequests(Number(id)),
          manuscriptsApi.versions(Number(id)),
        ]);
        setDetail(d as Record<string, unknown>);
        setRevisions((rev as { items: { comment?: string; created_at?: string }[] }).items);
        setVersions((ver as { items: VersionItem[] }).items);
      } catch (e) {
        setDetail(null);
        setLoadError(e instanceof Error ? e.message : "加载失败，请刷新重试");
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

  const breadcrumbItems: BreadcrumbItemType[] = [
    { title: <Link href="/">首页</Link> },
    { title: <Link href="/author">作者中心</Link> },
    { title: "稿件详情" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <HeaderBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <Breadcrumb items={breadcrumbItems} className="mb-4" />
          <Typography.Title level={5} className="!mb-4">
            稿件详情
          </Typography.Title>
          {revisedMessage && (
            <Alert message="修订稿已提交成功" type="success" showIcon className="mb-4" />
          )}
          {loading && (
            <div className="flex items-center gap-3 py-6">
              <Spin />
              <Typography.Text type="secondary">加载稿件信息…</Typography.Text>
            </div>
          )}
          {!loading && loadError && (
            <>
              <Alert message={loadError} type="warning" showIcon className="mb-4" action={<Button size="small" onClick={() => window.location.reload()}>刷新</Button>} />
              <Link href="/author"><Button type="link" className="!px-0">返回我的稿件</Button></Link>
            </>
          )}
          {!loading && detail && (
            <>
              <Descriptions column={1} size="small" bordered className="mb-4">
                <Descriptions.Item label="稿件编号">{manuscriptNo ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="标题">{title ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color="default">{STATUS_MAP[status ?? ""] ?? status ?? "—"}</Tag>
                </Descriptions.Item>
                {currentVersion && (
                  <Descriptions.Item label="当前版本">
                    <Space>
                      <span>v{String(currentVersion.version_number)}，{String(currentVersion.file_name_original)}</span>
                      <a
                        href={manuscriptsApi.downloadUrl(Number(id), Number(currentVersion.id))}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        下载
                      </a>
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
              {versions.length > 0 && (
                <Card size="small" title="历史版本" className="mb-4">
                  <List
                    size="small"
                    dataSource={versions}
                    renderItem={(v) => (
                      <List.Item
                        actions={[
                          <a key="dl" href={manuscriptsApi.downloadUrl(Number(id), v.id)} target="_blank" rel="noopener noreferrer">
                            下载
                          </a>,
                        ]}
                      >
                        v{v.version_number} — {v.file_name_original || "—"}（{v.created_at?.slice(0, 19)}）
                      </List.Item>
                    )}
                  />
                </Card>
              )}
              {revisions.length > 0 && (
                <Card size="small" title="退修意见" className="mb-4">
                  <List
                    size="small"
                    dataSource={revisions}
                    renderItem={(r, i) => (
                      <List.Item>
                        <div>
                          {r.comment ? <MarkdownRenderer content={r.comment} /> : <p className="mb-0">—</p>}
                          <Typography.Text type="secondary" className="text-xs">
                            {r.created_at?.slice(0, 19)}
                          </Typography.Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              )}
              {status === "revision_requested" && (
                <div className="mb-4">
                  <Link href={`/author/${id}/revise`}>
                    <Button type="primary">上传修订稿</Button>
                  </Link>
                </div>
              )}
              <Link href="/author">
                <Button type="link" className="!px-0">返回我的稿件</Button>
              </Link>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
