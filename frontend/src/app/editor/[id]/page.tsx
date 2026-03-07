"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
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
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import TypewriterMarkdown from "@/components/ui/TypewriterMarkdown";
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
  const [previewType, setPreviewType] = useState<"pdf" | "docx" | "doc" | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [docxPreviewText, setDocxPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  // AI 助手
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiChatError, setAiChatError] = useState<string | null>(null);
  // 退修意见草稿
  const [revisionDraftLoading, setRevisionDraftLoading] = useState(false);
  const [revisionDraftError, setRevisionDraftError] = useState<string | null>(null);

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

  const sendAiChat = useCallback(
    async (message: string) => {
      if (!id || !message.trim()) return;
      setAiChatError(null);
      const userMsg = message.trim();
      setAiChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
      setAiChatInput("");
      setAiChatLoading(true);
      try {
        const res = await editorApi.aiChat(Number(id), userMsg);
        setAiChatMessages((prev) => [...prev, { role: "assistant", content: res.content }]);
      } catch (e) {
        setAiChatError(e instanceof Error ? e.message : "请求失败");
        setAiChatMessages((prev) => prev.slice(0, -1));
      } finally {
        setAiChatLoading(false);
      }
    },
    [id],
  );

  const runRevisionDraft = useCallback(async () => {
    if (!id) return;
    setRevisionDraftError(null);
    setRevisionDraftLoading(true);
    try {
      const res = await editorApi.revisionDraft(Number(id));
      setRevisionComment(res.draft);
    } catch (e) {
      setRevisionDraftError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setRevisionDraftLoading(false);
    }
  }, [id]);

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

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  const manuscript = detail?.manuscript as Record<string, unknown> | undefined;
  const currentVersion = detail?.current_version as Record<string, unknown> | undefined;
  const parsed = detail?.parsed as Record<string, unknown> | undefined;
  const editorActions = (detail?.editor_actions as Record<string, unknown>[]) || [];
  const status = manuscript?.status as string | undefined;
  const manuscriptNo = manuscript?.manuscript_no as string | undefined;
  const title = manuscript?.title as string | undefined;
  const breadcrumbTitle = manuscriptNo || (title ? `${String(title).slice(0, 20)}${String(title).length > 20 ? "…" : ""}` : "稿件详情");

  useEffect(() => {
    const versionId = Number(currentVersion?.id);
    const fileName = String(currentVersion?.file_name_original ?? "");

    if (!id || !currentVersion || !versionId || !fileName) {
      setPreviewType(null);
      setDocxPreviewText("");
      setPreviewError(null);
      setPreviewLoading(false);
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
        setPreviewUrl("");
      }
      return;
    }

    const lowerName = fileName.toLowerCase();
    const nextType = lowerName.endsWith(".pdf")
      ? "pdf"
      : lowerName.endsWith(".docx")
        ? "docx"
        : lowerName.endsWith(".doc")
          ? "doc"
          : null;

    setPreviewType(nextType);
    setDocxPreviewText("");
    setPreviewError(null);

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
      setPreviewUrl("");
    }

    if (!nextType || nextType === "doc") {
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    fetch(editorApi.downloadUrl(Number(id), versionId))
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("读取原始稿件失败");
        }
        if (nextType === "pdf") {
          const blob = await res.blob();
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          previewObjectUrlRef.current = objectUrl;
          setPreviewUrl(objectUrl);
          return;
        }
        const arrayBuffer = await res.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (cancelled) return;
        setDocxPreviewText((result.value || "").trim().slice(0, 20000));
      })
      .catch((e) => {
        if (cancelled) return;
        setPreviewError(e instanceof Error ? e.message : "原始稿件预览失败");
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentVersion, id]);

  if (!user || user.role === "author") return null;

  const breadcrumbItems: BreadcrumbItemType[] = [
    { title: <Link href="/">首页</Link> },
    { title: <Link href="/editor">编辑工作台</Link> },
    { title: detail && manuscript ? breadcrumbTitle : "稿件详情" },
  ];

  return (
    <div className="bg-[#f5f6f8]">
      <HeaderBar />
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
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
              <Card
                size="small"
                title="原始稿件"
                className="mb-4"
                extra={
                  currentVersion ? (
                    <a
                      href={editorApi.downloadUrl(Number(id), Number(currentVersion.id))}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      下载原稿
                    </a>
                  ) : null
                }
              >
                {!currentVersion ? (
                  <Typography.Text type="secondary">当前稿件暂无可阅读版本。</Typography.Text>
                ) : (
                  <div className="space-y-3">
                    <Typography.Text type="secondary" className="block text-xs">
                      文件：{String(currentVersion.file_name_original || "未命名文件")}
                    </Typography.Text>
                    {previewLoading ? (
                      <div className="flex items-center gap-3 py-6">
                        <Spin />
                        <Typography.Text type="secondary">正在加载原始稿件…</Typography.Text>
                      </div>
                    ) : null}
                    {previewError ? <Alert message={previewError} type="warning" showIcon /> : null}
                    {!previewLoading && previewType === "pdf" && previewUrl ? (
                      <iframe
                        src={previewUrl}
                        title="原始稿件 PDF 预览"
                        className="h-[70vh] min-h-[520px] w-full border border-[#dedee3] bg-white"
                      />
                    ) : null}
                    {!previewLoading && previewType === "docx" ? (
                      <div className="max-h-[70vh] min-h-[520px] overflow-y-auto border border-[#dedee3] bg-white p-5 text-sm leading-8 text-[#2c2c2e]">
                        {docxPreviewText ? (
                          <pre className="whitespace-pre-wrap font-sans">{docxPreviewText}</pre>
                        ) : (
                          <Typography.Text type="secondary">DOCX 暂无可显示文本，建议下载原稿查看版式。</Typography.Text>
                        )}
                      </div>
                    ) : null}
                    {!previewLoading && previewType === "doc" ? (
                      <Alert
                        message="当前为 .doc 文件。浏览器端暂不支持稳定在线预览，建议直接下载原稿查看。"
                        type="info"
                        showIcon
                      />
                    ) : null}
                  </div>
                )}
              </Card>
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
                  <Button type="default" onClick={() => setAiAssistantOpen(true)}>
                    AI 助手
                  </Button>
                  {status !== "revision_requested" && status !== "rejected" && status !== "accepted" && (
                    <Button onClick={() => { setRevisionModalOpen(true); setRevisionDraftError(null); }}>退修</Button>
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
                  <div className="h-[52vh] min-h-[320px] max-h-[560px] overflow-y-auto pr-1">
                    <TypewriterMarkdown content={aiReport.content} />
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
                          {a.comment != null && (
                            <div className="mt-1 rounded bg-[#fafafa] px-3 py-2">
                              <MarkdownRenderer content={String(a.comment)} />
                            </div>
                          )}
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
        onCancel={() => { setRevisionModalOpen(false); setRevisionComment(""); setRevisionDraftError(null); }}
        onOk={() => runAction("revision_request", revisionComment)}
        okText="提交退修"
        cancelText="取消"
        confirmLoading={actionLoading}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" className="mb-2">请输入退修意见，将发送给作者。可先使用「AI 生成退修意见草稿」再修改。</Typography.Paragraph>
        <div className="mb-2">
          <Button
            type="dashed"
            size="small"
            onClick={runRevisionDraft}
            loading={revisionDraftLoading}
          >
            {revisionDraftLoading ? "生成中…" : "AI 生成退修意见草稿"}
          </Button>
          {revisionDraftError && (
            <Typography.Text type="danger" className="ml-2 text-sm">{revisionDraftError}</Typography.Text>
          )}
        </div>
        <textarea
          placeholder="请输入退修意见"
          value={revisionComment}
          onChange={(e) => setRevisionComment(e.target.value)}
          rows={6}
          className="w-full rounded border border-[#d9d9d9] px-4 py-2 text-[#333] focus:border-[#8B1538] focus:outline-none focus:ring-1 focus:ring-[#8B1538]"
        />
      </Modal>

      <Drawer
        title="AI 助手（基于当前稿件）"
        placement="right"
        width={420}
        open={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        destroyOnClose={false}
      >
        <Typography.Paragraph type="secondary" className="mb-3 text-sm">
          可基于本稿标题、摘要、关键词与初审报告回答问题。试试：
        </Typography.Paragraph>
        <Space direction="vertical" className="mb-4 w-full">
          {["适合哪个栏目？", "根据报告给一段退修意见", "概括主要问题"].map((q) => (
            <Button key={q} type="link" className="!p-0 !h-auto text-left" onClick={() => sendAiChat(q)} disabled={aiChatLoading}>
              {q}
            </Button>
          ))}
        </Space>
        {aiChatError && <Alert message={aiChatError} type="error" showIcon className="mb-3" />}
        <div className="flex flex-col gap-3 mb-3 max-h-[45vh] overflow-y-auto pr-1">
          {aiChatMessages.map((msg, i) => (
            <div
              key={i}
              className={`rounded px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-[#e6f4ff] ml-6"
                  : "bg-[#f5f5f5] mr-6"
              }`}
            >
              <Typography.Text type="secondary" className="text-xs">{msg.role === "user" ? "我" : "AI"}</Typography.Text>
              <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
          {aiChatLoading && (
            <div className="rounded px-3 py-2 bg-[#f5f5f5] mr-6">
              <Spin size="small" /> 思考中…
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Input.TextArea
            placeholder="输入问题…"
            value={aiChatInput}
            onChange={(e) => setAiChatInput(e.target.value)}
            onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); sendAiChat(aiChatInput); } }}
            rows={2}
            disabled={aiChatLoading}
          />
          <Button type="primary" onClick={() => sendAiChat(aiChatInput)} loading={aiChatLoading}>
            发送
          </Button>
        </div>
      </Drawer>

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
