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
  /** 仅当报告是本次会话中“刚生成”的才启用打字机效果 */
  const [reportJustGenerated, setReportJustGenerated] = useState(false);
  const [previewType, setPreviewType] = useState<"pdf" | "docx" | "doc" | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [docxPreviewText, setDocxPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  /** Word 转 PDF 预览：后端生成 PDF 后的 blob URL */
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);
  const pdfPreviewObjectUrlRef = useRef<string | null>(null);
  // AI 助手
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiChatError, setAiChatError] = useState<string | null>(null);
  // 退修意见草稿
  const [revisionDraftLoading, setRevisionDraftLoading] = useState(false);
  const [revisionDraftError, setRevisionDraftError] = useState<string | null>(null);
  // 引注检查
  const [citationCheckLoading, setCitationCheckLoading] = useState(false);
  const [citationCheckError, setCitationCheckError] = useState<string | null>(null);
  const [citationCheckUseLlm, setCitationCheckUseLlm] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const d = await editorApi.manuscriptDetail(Number(id));
      setDetail(d as Record<string, unknown>);
      if ((d as any).report) {
        setAiReport((d as any).report);
      } else {
        setAiReport(null);
      }
      setReportJustGenerated(false);
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
      setReportJustGenerated(true);
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

  const runCitationCheck = useCallback(async () => {
    if (!id) return;
    setCitationCheckError(null);
    setCitationCheckLoading(true);
    try {
      const res = await editorApi.runCitationCheck(Number(id), { use_llm: citationCheckUseLlm });
      setDetail((prev) => (prev ? { ...prev, citation_issues: res.issues } : null));
    } catch (e) {
      setCitationCheckError(e instanceof Error ? e.message : "引注检查失败");
    } finally {
      setCitationCheckLoading(false);
    }
  }, [id, citationCheckUseLlm]);

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
      if (pdfPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewObjectUrlRef.current);
        pdfPreviewObjectUrlRef.current = null;
      }
    };
  }, []);

  /** 请求后端将当前版本 Word 转为 PDF 并返回，用于预览 */
  const loadPdfPreview = useCallback(async () => {
    if (!id || !currentVersion) return;
    const versionId = Number(currentVersion.id);
    setPdfPreviewError(null);
    setPdfPreviewLoading(true);
    if (pdfPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(pdfPreviewObjectUrlRef.current);
      pdfPreviewObjectUrlRef.current = null;
      setPdfPreviewUrl("");
    }
    try {
      const url = editorApi.previewPdfUrl(Number(id), versionId);
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail || "生成 PDF 失败");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      pdfPreviewObjectUrlRef.current = objectUrl;
      setPdfPreviewUrl(objectUrl);
    } catch (e) {
      setPdfPreviewError(e instanceof Error ? e.message : "生成 PDF 预览失败");
    } finally {
      setPdfPreviewLoading(false);
    }
  }, [id, currentVersion]);

  const manuscript = detail?.manuscript as Record<string, unknown> | undefined;
  const currentVersion = detail?.current_version as Record<string, unknown> | undefined;
  const parsed = detail?.parsed as Record<string, unknown> | undefined;
  const editorActions = (detail?.editor_actions as Record<string, unknown>[]) || [];
  const citationIssues = (detail?.citation_issues as { location: string; description: string; suggestion?: string }[]) || [];
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
              {/* 主布局：左侧信息与操作区，右侧稿件预览区 */}
              <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 xl:gap-8">
                {/* 左侧：元数据 + 操作 + 引注 + AI 报告 + 操作记录 */}
                <div className="flex flex-col gap-4 order-2 xl:order-1">
                  <Card size="small" className="shadow-sm">
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="稿件编号">{String(manuscript.manuscript_no)}</Descriptions.Item>
                      <Descriptions.Item label="标题">{String(manuscript.title)}</Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <Tag color="default">{STATUS_MAP[status ?? ""] ?? status}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="投稿人 ID">{String(manuscript.submitted_by)}</Descriptions.Item>
                      {currentVersion && (
                        <Descriptions.Item label="当前版本">
                          <Space>
                            <span className="text-xs">v{String(currentVersion.version_number)}，{String(currentVersion.file_name_original)}</span>
                            <a href={editorApi.downloadUrl(Number(id), Number(currentVersion.id))} target="_blank" rel="noopener noreferrer">
                              下载
                            </a>
                          </Space>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </Card>
                  {parsed && (
                    <Card size="small" title="摘要与关键词" className="shadow-sm">
                      <Typography.Paragraph className="!mb-1 text-sm" ellipsis={{ rows: 3, expandable: true }}>
                        {String(parsed.abstract || "未识别")}
                      </Typography.Paragraph>
                      <Typography.Text type="secondary" className="text-xs">{String(parsed.keywords || "未识别")}</Typography.Text>
                    </Card>
                  )}
                  <Card size="small" title="操作" className="shadow-sm">
                    {aiReviewLoading && (
                      <Alert message="正在生成 AI 初审报告…" type="info" showIcon className="mb-3 text-xs" />
                    )}
                    <Space wrap size="small">
                      <Button type="primary" ghost size="small" onClick={runAiReview} loading={aiReviewLoading}>
                        生成 AI 初审报告
                      </Button>
                      <Button type="default" size="small" onClick={() => setAiAssistantOpen(true)}>AI 助手</Button>
                      {status !== "revision_requested" && status !== "rejected" && status !== "accepted" && (
                        <Button size="small" onClick={() => { setRevisionModalOpen(true); setRevisionDraftError(null); }}>退修</Button>
                      )}
                      {status !== "rejected" && (
                        <Button danger size="small" onClick={() => setRejectConfirmOpen(true)} disabled={actionLoading}>退稿</Button>
                      )}
                      {status !== "accepted" && (
                        <Button type="primary" size="small" onClick={() => runAction("accept")} disabled={actionLoading}>录用</Button>
                      )}
                    </Space>
                  </Card>
                  {aiError && <Alert message={aiError} type="error" showIcon />}
                  <Card size="small" title="引注检查" className="shadow-sm">
                    <Space wrap className="mb-2" align="center" size="small">
                      <Button type="default" size="small" onClick={runCitationCheck} loading={citationCheckLoading}>
                        {citationCheckLoading ? "检查中…" : "运行引注检查"}
                      </Button>
                      <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-600">
                        <input type="checkbox" checked={citationCheckUseLlm} onChange={(e) => setCitationCheckUseLlm(e.target.checked)} className="rounded border-gray-300" />
                        使用大模型辅助
                      </label>
                    </Space>
                    {citationCheckError && <Alert message={citationCheckError} type="error" showIcon className="mb-2" />}
                    {citationIssues.length > 0 ? (
                      <Typography.Text strong className="text-xs">发现 {citationIssues.length} 处引注问题</Typography.Text>
                    ) : !citationCheckLoading && (
                      <Typography.Text type="secondary" className="text-xs">运行后显示结果</Typography.Text>
                    )}
                    {citationIssues.length > 0 && (
                      <List
                        size="small"
                        dataSource={citationIssues}
                        className="mt-2 max-h-[200px] overflow-y-auto"
                        renderItem={(item) => (
                          <List.Item className="!px-0">
                            <Typography.Text strong className="text-xs">[{item.location}]</Typography.Text>
                            <Typography.Text className="text-xs ml-1">{item.description}</Typography.Text>
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>
                  {aiReport && (
                    <Card
                      size="small"
                      title="AI 初审报告"
                      className="shadow-sm"
                      extra={<Button type="link" size="small" onClick={copyReport}>复制</Button>}
                    >
                      <div className="max-h-[280px] overflow-y-auto pr-1 text-xs">
                        <TypewriterMarkdown content={aiReport.content} enabled={reportJustGenerated} />
                      </div>
                    </Card>
                  )}
                  {editorActions.length > 0 && (
                    <Card size="small" title="操作记录" className="shadow-sm">
                      <List
                        size="small"
                        dataSource={editorActions.slice(0, 5)}
                        renderItem={(a) => (
                          <List.Item className="!px-0">
                            <span className="text-xs">{String(a.action_type)} → {String(a.to_status)}</span>
                            <Typography.Text type="secondary" className="text-xs block">{String(a.created_at ?? "").slice(0, 16)}</Typography.Text>
                          </List.Item>
                        )}
                      />
                      {editorActions.length > 5 && (
                        <Typography.Text type="secondary" className="text-xs">共 {editorActions.length} 条</Typography.Text>
                      )}
                    </Card>
                  )}
                  <Link href="/editor"><Button type="link" size="small" className="!px-0">返回列表</Button></Link>
                </div>

                {/* 右侧：稿件预览（主视觉区域） */}
                <div className="order-1 xl:order-2 min-h-[560px]">
                  <Card
                    size="small"
                    title="原始稿件"
                    className="h-full shadow-sm"
                    extra={
                      currentVersion ? (
                        <a href={editorApi.downloadUrl(Number(id), Number(currentVersion.id))} target="_blank" rel="noopener noreferrer" className="text-xs">
                          下载原稿
                        </a>
                      ) : null
                    }
                  >
                    {!currentVersion ? (
                      <Typography.Text type="secondary">当前稿件暂无可阅读版本。</Typography.Text>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Typography.Text type="secondary" className="text-xs">
                          文件：{String(currentVersion.file_name_original || "未命名文件")}
                          {(previewType === "docx" || previewType === "doc") && (
                            <span className="ml-2">
                              （可优先使用「PDF 预览」查看版式）
                            </span>
                          )}
                        </Typography.Text>
                        {previewLoading ? (
                          <div className="flex items-center gap-3 py-12">
                            <Spin />
                            <Typography.Text type="secondary">正在加载预览…</Typography.Text>
                          </div>
                        ) : null}
                        {previewError ? <Alert message={previewError} type="warning" showIcon /> : null}
                        {!previewLoading && previewType === "pdf" && previewUrl ? (
                          <iframe
                            src={previewUrl}
                            title="原始稿件 PDF 预览"
                            className="h-[75vh] min-h-[520px] w-full rounded border border-[#e8e8e8] bg-white"
                          />
                        ) : null}
                        {!previewLoading && (previewType === "docx" || previewType === "doc") && pdfPreviewUrl ? (
                          <iframe
                            src={pdfPreviewUrl}
                            title="Word 转 PDF 预览"
                            className="h-[75vh] min-h-[520px] w-full rounded border border-[#e8e8e8] bg-white"
                          />
                        ) : null}
                        {!previewLoading && (previewType === "docx" || previewType === "doc") && !pdfPreviewUrl && (
                          <div className="space-y-2">
                            <Button
                              type="primary"
                              size="small"
                              onClick={loadPdfPreview}
                              loading={pdfPreviewLoading}
                            >
                              {pdfPreviewLoading ? "正在生成 PDF…" : "转为 PDF 预览"}
                            </Button>
                            {pdfPreviewError && <Alert message={pdfPreviewError} type="warning" showIcon />}
                            {previewType === "docx" && (
                              <div className="max-h-[60vh] min-h-[320px] overflow-y-auto border border-[#e8e8e8] rounded bg-white p-4 text-sm leading-7 text-[#2c2c2e]">
                                {docxPreviewText ? (
                                  <pre className="whitespace-pre-wrap font-sans">{docxPreviewText}</pre>
                                ) : (
                                  <Typography.Text type="secondary">暂无文本预览，请点击「转为 PDF 预览」或下载原稿查看。</Typography.Text>
                                )}
                              </div>
                            )}
                            {previewType === "doc" && !docxPreviewText && (
                              <Typography.Text type="secondary">.doc 格式可尝试「转为 PDF 预览」（需服务器安装 LibreOffice），或下载原稿查看。</Typography.Text>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
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
