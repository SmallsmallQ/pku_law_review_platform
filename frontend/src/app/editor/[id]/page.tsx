"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Descriptions,
  List,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import type { BreadcrumbItemType } from "antd/es/breadcrumb/Breadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import { STATUS_MAP } from "@/lib/constants";
import { editorApi } from "@/services/api";

export default function EditorManuscriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReport, setAiReport] = useState<{ content: string; model: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const d = await editorApi.manuscriptDetail(Number(id));
      setDetail(d as Record<string, unknown>);
      if ((d as any).report) {
        setAiReport((d as any).report);
      }
    } catch (e) {
      setDetail(null);
      setLoadError(e instanceof Error ? e.message : "加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!user || user.role === "author") {
      router.push("/");
      return;
    }
    load();
  }, [user, id, router, load]);

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

  const copyReport = useCallback(() => {
    if (!aiReport?.content) return;
    navigator.clipboard.writeText(aiReport.content).then(
      () => setSuccessMessage("已复制到剪贴板"),
      () => setAiError("复制失败"),
    );
  }, [aiReport?.content]);

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
  const parsed = detail?.parsed as Record<string, unknown> | undefined;
  const editorActions = (detail?.editor_actions as Record<string, unknown>[]) || [];
  const status = manuscript?.status as string | undefined;
  const manuscriptNo = manuscript?.manuscript_no as string | undefined;
  const title = manuscript?.title as string | undefined;
  const breadcrumbTitle = manuscriptNo || (title ? `${String(title).slice(0, 20)}${String(title).length > 20 ? "…" : ""}` : "稿件详情");

  if (!user || user.role === "author") return null;

  const breadcrumbItems: BreadcrumbItemType[] = [
    { title: <Link href="/">首页</Link> },
    { title: <Link href="/editor">编辑工作台</Link> },
    { title: detail && manuscript ? breadcrumbTitle : "稿件详情" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <HeaderBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <Breadcrumb items={breadcrumbItems} className="mb-4" />
          <Typography.Title level={5} className="!mb-4">
            稿件详情（编辑）
          </Typography.Title>
          {successMessage && (
            <Alert message={successMessage} type="success" showIcon className="mb-4" />
          )}
          {loading && (
            <div className="flex items-center gap-3 py-6">
              <Spin />
              <Typography.Text type="secondary">加载稿件信息…</Typography.Text>
            </div>
          )}
          {!loading && loadError && (
            <>
              <Alert message={loadError} type="warning" showIcon className="mb-4" action={<Button size="small" onClick={() => load()}>重试</Button>} />
              <Link href="/editor"><Button type="link" className="!px-0">返回列表</Button></Link>
            </>
          )}
          {!loading && detail && manuscript && (
            <>
              <Descriptions column={1} size="small" bordered className="mb-4">
                <Descriptions.Item label="稿件编号">{String(manuscript.manuscript_no)}</Descriptions.Item>
                <Descriptions.Item label="标题">{String(manuscript.title)}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color="default">{STATUS_MAP[status ?? ""] ?? status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="投稿人 ID">{String(manuscript.submitted_by)}</Descriptions.Item>
                {currentVersion && (
                  <Descriptions.Item label="当前版本">
                    <Space>
                      <span>v{String(currentVersion.version_number)}，{String(currentVersion.file_name_original)}</span>
                      <a href={editorApi.downloadUrl(Number(id), Number(currentVersion.id))} target="_blank" rel="noopener noreferrer">
                        下载
                      </a>
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
              {parsed && (
                <Card size="small" title="解析元数据" className="mb-4">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="摘要">{String(parsed.abstract || "未识别")}</Descriptions.Item>
                    <Descriptions.Item label="关键词">{String(parsed.keywords || "未识别")}</Descriptions.Item>
                  </Descriptions>
                </Card>
              )}
              <Card size="small" title="操作" className="mb-4">
                {aiReviewLoading && (
                  <Alert message="正在生成 AI 初审报告，预计需要 10–30 秒，请稍候。" type="info" showIcon className="mb-3" />
                )}
                <Space wrap>
                  <Button
                    type="primary"
                    ghost
                    onClick={runAiReview}
                    loading={aiReviewLoading}
                  >
                    {aiReviewLoading ? "生成中…" : "生成 AI 初审报告"}
                  </Button>
                  {status !== "revision_requested" && status !== "rejected" && status !== "accepted" && (
                    <Button onClick={() => setRevisionModalOpen(true)}>退修</Button>
                  )}
                  {status !== "rejected" && (
                    <Button danger onClick={() => setRejectConfirmOpen(true)} disabled={actionLoading}>
                      退稿
                    </Button>
                  )}
                  {status !== "accepted" && (
                    <Button type="primary" onClick={() => runAction("accept")} disabled={actionLoading}>
                      录用
                    </Button>
                  )}
                </Space>
              </Card>
              {aiError && (
                <Alert message={aiError} type="error" showIcon className="mb-4" />
              )}
              {aiReport && (
                <Card
                  size="small"
                  title="AI 初审报告"
                  className="mb-4"
                  extra={
                    <Button type="link" size="small" onClick={copyReport}>
                      复制报告
                    </Button>
                  }
                >
                  <Typography.Text type="secondary" className="text-xs block mb-2">
                    模型：{aiReport.model}
                  </Typography.Text>
                  <div className="max-h-[420px] overflow-y-auto rounded border border-[#f0f0f0] bg-[#fafafa] p-4 text-sm text-[#333] whitespace-pre-wrap">
                    {aiReport.content}
                  </div>
                </Card>
              )}
              {editorActions.length > 0 && (
                <Card size="small" title="操作记录" className="mb-4">
                  <List
                    size="small"
                    dataSource={editorActions}
                    renderItem={(a, i) => (
                      <List.Item>
                        <div>
                          <p className="mb-0">{String(a.action_type)}：{String(a.from_status)} → {String(a.to_status)}</p>
                          {a.comment != null && <Typography.Text type="secondary" className="block mt-1">{String(a.comment)}</Typography.Text>}
                          <Typography.Text type="secondary" className="text-xs block mt-1">{String(a.created_at ?? "").slice(0, 19)}</Typography.Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              )}
              <Link href="/editor">
                <Button type="link" className="!px-0">返回列表</Button>
              </Link>
            </>
          )}
        </Card>
      </main>

      <Modal
        title="退修意见"
        open={revisionModalOpen}
        onCancel={() => { setRevisionModalOpen(false); setRevisionComment(""); }}
        onOk={() => runAction("revision_request", revisionComment)}
        okText="提交退修"
        cancelText="取消"
        confirmLoading={actionLoading}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" className="mb-2">请输入退修意见，将发送给作者。</Typography.Paragraph>
        <textarea
          placeholder="请输入退修意见"
          value={revisionComment}
          onChange={(e) => setRevisionComment(e.target.value)}
          rows={5}
          className="w-full rounded border border-[#d9d9d9] px-4 py-2 text-[#333] focus:border-[#8B1538] focus:outline-none focus:ring-1 focus:ring-[#8B1538]"
        />
      </Modal>

      <Modal
        title="确认退稿"
        open={rejectConfirmOpen}
        onCancel={() => setRejectConfirmOpen(false)}
        onOk={() => { setRejectConfirmOpen(false); runAction("reject"); }}
        okText="确定退稿"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        confirmLoading={actionLoading}
      >
        <p>确定要退稿吗？此操作将把稿件状态设为「退稿」。</p>
      </Modal>
    </div>
  );
}
