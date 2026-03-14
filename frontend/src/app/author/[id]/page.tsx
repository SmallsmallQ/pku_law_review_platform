"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert, Breadcrumb, Button, Descriptions, List, Space, Spin, Tag, Typography, Divider } from "antd";
import type { BreadcrumbItemType } from "antd/es/breadcrumb/Breadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { STATUS_MAP } from "@/lib/constants";
import { jobsApi, manuscriptsApi, type BackgroundJob } from "@/services/api";

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
  const [parseJob, setParseJob] = useState<BackgroundJob | null>(null);

  useEffect(() => {
    if (searchParams.get("revised") === "1") {
      setRevisedMessage(true);
      const t = setTimeout(() => setRevisedMessage(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  const loadDetail = useCallback(async () => {
    if (!user || !id) return;
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
  }, [user, id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    const parseJobId = Number(searchParams.get("parseJobId"));
    if (!user || !parseJobId || Number.isNaN(parseJobId)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const job = await jobsApi.get(parseJobId);
        if (cancelled) return;
        setParseJob(job);
        if (job.status === "succeeded") {
          await loadDetail();
          return;
        }
        if (job.status === "pending" || job.status === "running") {
          timer = setTimeout(poll, 1500);
        }
      } catch {
        if (!cancelled) {
          timer = setTimeout(poll, 3000);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loadDetail, searchParams, user]);

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
    <div className="bg-white text-[#1d1d1f] min-h-screen flex flex-col">
      <HeaderBar />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={breadcrumbItems} className="mb-6" />
        
        <div className="flex items-center justify-between mb-2">
          <Typography.Title level={2} className="!mb-0 !font-medium !text-gray-900">
            稿件详情
          </Typography.Title>
          <div className="flex items-center gap-3">
             {status === "revision_requested" && (
                <Link href={`/author/${id}/revise`}>
                  <Button type="primary" className="bg-[#8B1538] hover:!bg-[#A51D45] rounded-sm border-none shadow-sm h-9">上传修订稿</Button>
                </Link>
             )}
             <Link href="/author">
                <Button className="rounded-sm h-9">返回我的稿件</Button>
             </Link>
          </div>
        </div>

        <Divider className="!border-[#e5e7eb] !mb-8 !mt-4" />

        {revisedMessage && (
          <Alert message="修订稿已提交成功" type="success" showIcon className="mb-6 rounded-sm" />
        )}
        {searchParams.get("submitted") === "1" && (
          <Alert message="稿件已提交，系统正在后台解析正文与脚注。" type="info" showIcon className="mb-6 rounded-sm" />
        )}
        {parseJob && (parseJob.status === "pending" || parseJob.status === "running") && (
          <Alert message="后台解析进行中，完成后本页会自动刷新。" type="info" showIcon className="mb-6 rounded-sm" />
        )}
        {parseJob?.status === "failed" && (
          <Alert message={parseJob.error || "后台解析失败，请稍后重试或联系编辑部。"} type="warning" showIcon className="mb-6 rounded-sm" />
        )}
        {parseJob?.status === "succeeded" && (
          <Alert message="后台解析已完成。" type="success" showIcon className="mb-6 rounded-sm" />
        )}
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50 border border-[#e5e7eb] rounded-sm">
            <Spin size="large" />
            <Typography.Text type="secondary" className="mt-4">加载稿件信息中…</Typography.Text>
          </div>
        )}
        
        {!loading && loadError && (
          <div className="flex flex-col items-center justify-center py-20 bg-red-50 border border-red-100 rounded-sm space-y-4">
             <Alert message={loadError} type="warning" showIcon className="rounded-sm shadow-sm" />
             <Space>
               <Button size="middle" onClick={() => window.location.reload()} className="rounded-sm">刷新重试</Button>
               <Link href="/author"><Button type="primary" className="bg-[#8B1538] hover:!bg-[#A51D45] border-none rounded-sm">返回我的稿件</Button></Link>
             </Space>
          </div>
        )}
        
        {!loading && detail && (
          <div className="space-y-12">
            <section>
                <Typography.Title level={4} className="!mb-6 !font-normal !text-gray-900 border-l-4 border-[#8B1538] pl-3">
                  基本信息
                </Typography.Title>
                <Descriptions column={1} size="default" bordered className="bg-white rounded-sm overflow-hidden border-[#e5e7eb]" labelStyle={{ width: '140px', backgroundColor: '#f9fafb', color: '#4b5563' }} contentStyle={{ color: '#1f2937' }}>
                  <Descriptions.Item label="相关编号">{manuscriptNo ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="稿件全称">{title ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="当前状态">
                    <Tag className="rounded-sm px-2 py-0.5 border" color="default">{STATUS_MAP[status ?? ""] ?? status ?? "—"}</Tag>
                  </Descriptions.Item>
                  {currentVersion && (
                    <Descriptions.Item label="最近上传版本">
                      <div className="flex items-center justify-between">
                         <span className="text-gray-700">版本标识：v{String(currentVersion.version_number)}，文件名：{String(currentVersion.file_name_original)}</span>
                         <a
                          href={manuscriptsApi.downloadUrl(Number(id), Number(currentVersion.id))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8B1538] hover:underline hover:text-[#A51D45] font-medium ml-4 bg-red-50/50 px-3 py-1 rounded border border-red-100"
                         >
                          安全下载
                         </a>
                      </div>
                    </Descriptions.Item>
                  )}
                </Descriptions>
            </section>

            {revisions.length > 0 && (
              <section>
                 <Typography.Title level={4} className="!mb-6 !font-normal !text-gray-900 border-l-4 border-orange-500 pl-3">
                    系统退修历史与编辑意见
                  </Typography.Title>
                  <div className="border border-orange-200 rounded-sm bg-orange-50/30 overflow-hidden shadow-sm">
                    <List
                      className="divide-y divide-orange-100"
                      dataSource={revisions}
                      renderItem={(r, index) => (
                        <List.Item className="!p-6 hover:bg-white transition-colors">
                          <div className="w-full">
                            <div className="flex items-center justify-between mb-4 border-b border-orange-100/50 pb-3">
                              <span className="font-medium text-orange-800">第 {revisions.length - index} 次退修记录</span>
                              <Typography.Text className="text-sm text-orange-600/80 bg-orange-100 px-2 py-0.5 rounded-sm">
                                下达于: {r.created_at?.slice(0, 19)}
                              </Typography.Text>
                            </div>
                            <div className="prose prose-sm prose-orange max-w-none text-gray-700 bg-white/50 p-4 rounded border border-orange-100/30">
                              {r.comment ? <MarkdownRenderer content={r.comment} /> : <span className="text-gray-400 italic">管理员未附具体修改意见，通常为格式退修，请自查。</span>}
                            </div>
                          </div>
                        </List.Item>
                      )}
                    />
                  </div>
              </section>
            )}

            {versions.length > 0 && (
              <section>
                <Typography.Title level={4} className="!mb-6 !font-normal !text-gray-900 border-l-4 border-gray-400 pl-3">
                  稿件正文历史版本归档
                </Typography.Title>
                <div className="border border-[#e5e7eb] rounded-sm bg-white overflow-hidden shadow-sm">
                  <List
                    className="divide-y divide-[#e5e7eb]"
                    dataSource={versions}
                    renderItem={(v) => (
                      <List.Item
                        className="!p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group"
                        actions={[
                          <a key="dl" href={manuscriptsApi.downloadUrl(Number(id), v.id)} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-medium">
                            下载此版本
                          </a>,
                        ]}
                      >
                        <div className="flex items-center gap-4">
                           <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-serif-sc font-medium">
                              v{v.version_number}
                           </span>
                           <div className="flex flex-col">
                              <span className="text-gray-800 font-medium">{v.file_name_original || "未命名原稿"}</span>
                              <span className="text-xs text-gray-500 mt-0.5">归档时间: {v.created_at?.slice(0, 19)}</span>
                           </div>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
