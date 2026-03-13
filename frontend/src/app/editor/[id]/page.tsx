"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import type { BreadcrumbItemType } from "antd/es/breadcrumb/Breadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import TypewriterMarkdown from "@/components/ui/TypewriterMarkdown";
import { REVIEW_STAGE_MAP, REVIEW_STAFF_ROLES, ROLE_MAP, STATUS_MAP } from "@/lib/constants";
import { editorApi, type EditorManuscriptDetail, type ReviewSubmissionItem } from "@/services/api";

const REVIEW_RECOMMENDATION_MAP: Record<string, string> = {
  accept: "建议通过",
  minor_revision: "建议小修",
  major_revision: "建议大修",
  reject: "建议退稿",
};

const { Paragraph, Text, Title } = Typography;

export default function EditorManuscriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const isReviewStaff = !!user?.role && REVIEW_STAFF_ROLES.includes(user.role as (typeof REVIEW_STAFF_ROLES)[number]);
  const [detail, setDetail] = useState<EditorManuscriptDetail | null>(null);
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
  const [reviewSubmitLoading, setReviewSubmitLoading] = useState(false);
  const [reviewRecommendation, setReviewRecommendation] = useState<string>("major_revision");
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [originalityScore, setOriginalityScore] = useState<number | null>(null);
  const [rigorScore, setRigorScore] = useState<number | null>(null);
  const [writingScore, setWritingScore] = useState<number | null>(null);
  const [reviewSummary, setReviewSummary] = useState("");
  const [reviewMajorIssues, setReviewMajorIssues] = useState("");
  const [reviewRequirements, setReviewRequirements] = useState("");
  const [reviewConfidentialNotes, setReviewConfidentialNotes] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const d = await editorApi.manuscriptDetail(Number(id));
      const report = d.report;
      setDetail(d);
      setAiReport(report ? { content: String(report.content ?? ""), model: String(report.model ?? "") } : null);
      setReportJustGenerated(false);
    } catch (e) {
      setDetail(null);
      setLoadError(e instanceof Error ? e.message : "加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!user || !isReviewStaff) {
      router.push("/");
      return;
    }
    load();
  }, [user, id, router, load, isReviewStaff]);

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

  const manuscript = detail?.manuscript as Record<string, unknown> | undefined;
  const currentVersion = detail?.current_version as Record<string, unknown> | undefined;
  const parsed = detail?.parsed as Record<string, unknown> | undefined;
  const editorActions = (detail?.editor_actions as Record<string, unknown>[]) || [];
  const assignments = (detail?.assignments as unknown as Array<Record<string, unknown>>) || [];
  const availableActions = (detail?.available_actions as string[]) || [];
  const reviewSubmissions = (detail?.review_submissions as ReviewSubmissionItem[]) || [];
  const citationIssues = (detail?.citation_issues as Array<{ location: string; description: string; suggestion?: string }>) || [];
  const status = manuscript?.status as string | undefined;
  const currentStage = manuscript?.current_review_stage as string | undefined;
  const manuscriptNo = manuscript?.manuscript_no as string | undefined;
  const title = manuscript?.title as string | undefined;
  const breadcrumbTitle = manuscriptNo || (title ? `${String(title).slice(0, 20)}${String(title).length > 20 ? "…" : ""}` : "稿件详情");
  const currentStageAssignment = assignments.find((item) => Number(item.reviewer_id) === user?.id && String(item.review_stage) === currentStage);
  const currentUserReview = reviewSubmissions.find((item) => item.reviewer_id === user?.id && item.review_stage === currentStage);

  const jumpToAiDetect = useCallback(() => {
    if (!id) return;
    router.push(`/ai-detect?source=editor&manuscriptId=${id}`);
  }, [id, router]);

  const submitStructuredReview = useCallback(async () => {
    if (!id || !currentStage) return;
    setReviewSubmitLoading(true);
    try {
      const res = await editorApi.submitStructuredReview(Number(id), {
        review_stage: currentStage,
        recommendation: reviewRecommendation,
        overall_score: overallScore,
        originality_score: originalityScore,
        rigor_score: rigorScore,
        writing_score: writingScore,
        summary: reviewSummary,
        major_issues: reviewMajorIssues,
        revision_requirements: reviewRequirements,
        confidential_notes: reviewConfidentialNotes,
      });
      setDetail((prev) => (prev ? { ...prev, review_submissions: res.review_submissions } : prev));
      setSuccessMessage("结构化审稿意见已保存");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "提交审稿意见失败");
    } finally {
      setReviewSubmitLoading(false);
    }
  }, [currentStage, id, overallScore, originalityScore, reviewConfidentialNotes, reviewMajorIssues, reviewRecommendation, reviewRequirements, reviewSummary, rigorScore, writingScore]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    setReviewRecommendation(currentUserReview?.recommendation ?? "major_revision");
    setOverallScore(currentUserReview?.overall_score ?? null);
    setOriginalityScore(currentUserReview?.originality_score ?? null);
    setRigorScore(currentUserReview?.rigor_score ?? null);
    setWritingScore(currentUserReview?.writing_score ?? null);
    setReviewSummary(currentUserReview?.summary ?? "");
    setReviewMajorIssues(currentUserReview?.major_issues ?? "");
    setReviewRequirements(currentUserReview?.revision_requirements ?? "");
    setReviewConfidentialNotes(currentUserReview?.confidential_notes ?? "");
  }, [currentUserReview]);

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

  if (!user || !isReviewStaff) return null;

  const breadcrumbItems: BreadcrumbItemType[] = [
    { title: "首页", href: "/" },
    { title: "编辑工作台", href: "/editor" },
    { title: detail != null && manuscript != null ? breadcrumbTitle : "稿件详情" },
  ];

  return (
    <div className="bg-[#f4f6f8]">
      <HeaderBar />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Space direction="vertical" size={24} className="flex w-full">
          <Card styles={{ body: { padding: 28 } }}>
            <Breadcrumb items={breadcrumbItems} className="mb-4" />
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} xl={16}>
                <Text className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1538]">
                  Editorial Review
                </Text>
                <Title level={2} className="!mb-2 !mt-3 !text-[#1f2937]">
                  稿件详情（编辑）
                </Title>
                <Paragraph className="!mb-0 !max-w-3xl !text-[15px] !leading-8 !text-[#667085]">
                  在同一工作台里查看稿件元数据、审稿意见、AI 报告和原稿预览，并继续推进内审、外审、退修或录用流程。
                </Paragraph>
              </Col>
              <Col xs={24} xl={8}>
                <Card size="small" styles={{ body: { padding: 20 } }}>
                  <Descriptions
                    column={1}
                    size="small"
                    items={[
                      { key: "no", label: "稿件编号", children: manuscriptNo || "加载中" },
                      { key: "status", label: "当前状态", children: status ? <Tag>{STATUS_MAP[status] ?? status}</Tag> : "—" },
                      {
                        key: "stage",
                        label: "当前阶段",
                        children: currentStage ? <Tag color="blue">{REVIEW_STAGE_MAP[currentStage] ?? currentStage}</Tag> : "—",
                      },
                    ]}
                  />
                  <Space wrap className="mt-4">
                    <Link href="/editor">
                      <Button>返回列表</Button>
                    </Link>
                    {currentVersion ? (
                      <a href={editorApi.downloadUrl(Number(id), Number(currentVersion.id))} target="_blank" rel="noopener noreferrer">
                        <Button type="primary">下载原稿</Button>
                      </a>
                    ) : null}
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>

          {successMessage && <Alert message={successMessage} type="success" showIcon />}

          {loading && (
            <Card styles={{ body: { padding: 28 } }}>
              <div className="flex items-center gap-3 py-4">
                <Spin />
                <Text type="secondary">加载稿件信息…</Text>
              </div>
            </Card>
          )}

          {!loading && loadError && (
            <Card styles={{ body: { padding: 28 } }}>
              <Alert
                message={loadError}
                type="warning"
                showIcon
                action={<Button size="small" onClick={() => load()}>重试</Button>}
              />
            </Card>
          )}

          {!loading && detail && manuscript && (
            <Row gutter={[24, 24]} align="top">
              <Col xs={24} xl={9}>
                <Space direction="vertical" size={24} className="flex w-full">
                  <Card title="稿件信息">
                    <Descriptions
                      column={1}
                      size="small"
                      bordered
                      items={[
                        { key: "manuscript_no", label: "稿件编号", children: String(manuscript.manuscript_no) },
                        { key: "title", label: "标题", children: String(manuscript.title) },
                        { key: "status", label: "状态", children: <Tag>{STATUS_MAP[status ?? ""] ?? status}</Tag> },
                        {
                          key: "stage",
                          label: "当前阶段",
                          children: currentStage ? <Tag color="blue">{REVIEW_STAGE_MAP[currentStage] ?? currentStage}</Tag> : "—",
                        },
                        { key: "submitted_by", label: "投稿人 ID", children: String(manuscript.submitted_by) },
                        {
                          key: "assignments",
                          label: "审稿分配",
                          children: assignments.length > 0
                            ? assignments
                                .map((item) => `${REVIEW_STAGE_MAP[String(item.review_stage)] ?? String(item.review_stage)}: ${String(item.reviewer_name)}${item.reviewer_role ? `（${ROLE_MAP[String(item.reviewer_role)] ?? String(item.reviewer_role)}）` : ""}`)
                                .join("；")
                            : "—",
                        },
                        currentVersion
                          ? {
                              key: "version",
                              label: "当前版本",
                              children: (
                                <Space>
                                  <span className="text-xs">
                                    v{String(currentVersion.version_number)}，{String(currentVersion.file_name_original)}
                                  </span>
                                  <a
                                    href={editorApi.downloadUrl(Number(id), Number(currentVersion.id))}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    下载
                                  </a>
                                </Space>
                              ),
                            }
                          : { key: "version_empty", label: "当前版本", children: "—" },
                      ]}
                    />
                  </Card>

                  {parsed && (
                    <Card title="摘要与关键词">
                      <Paragraph className="!mb-2 text-sm" ellipsis={{ rows: 4, expandable: true }}>
                        {String(parsed.abstract || "未识别")}
                      </Paragraph>
                      <Text type="secondary" className="text-xs">
                        {String(parsed.keywords || "未识别")}
                      </Text>
                    </Card>
                  )}

                  <Card title="流程操作">
                    <Space direction="vertical" size={16} className="flex w-full">
                      {aiReviewLoading && <Alert message="正在生成 AI 初审报告…" type="info" showIcon />}
                      <Space wrap size="small">
                        <Button type="primary" onClick={runAiReview} loading={aiReviewLoading}>
                          生成 AI 初审报告
                        </Button>
                        <Button onClick={jumpToAiDetect}>一键跳转 AI 率审核</Button>
                        <Button onClick={() => setAiAssistantOpen(true)}>AI 助手</Button>
                        {availableActions.includes("revision_request") && (
                          <Button onClick={() => { setRevisionModalOpen(true); setRevisionDraftError(null); }}>
                            退修
                          </Button>
                        )}
                        {availableActions.includes("reject") && (
                          <Button danger onClick={() => setRejectConfirmOpen(true)} disabled={actionLoading}>
                            退稿
                          </Button>
                        )}
                        {availableActions.includes("submit_internal_review") && (
                          <Button type="primary" onClick={() => runAction("submit_internal_review")} disabled={actionLoading}>
                            提交内审
                          </Button>
                        )}
                        {availableActions.includes("submit_external_review") && (
                          <Button type="primary" onClick={() => runAction("submit_external_review")} disabled={actionLoading}>
                            提交外审
                          </Button>
                        )}
                        {availableActions.includes("submit_final_submission") && (
                          <Button type="primary" onClick={() => runAction("submit_final_submission")} disabled={actionLoading}>
                            提交成稿
                          </Button>
                        )}
                        {availableActions.includes("accept") && (
                          <Button type="primary" onClick={() => runAction("accept")} disabled={actionLoading}>
                            录用
                          </Button>
                        )}
                      </Space>
                    </Space>
                  </Card>

                  {currentStage && (
                    <Card title="结构化审稿意见">
                      {currentStageAssignment ? (
                        <Space direction="vertical" size={12} className="flex w-full">
                          <Text type="secondary" className="text-xs">
                            当前以「{REVIEW_STAGE_MAP[currentStage] ?? currentStage}」身份提交意见。保存后，可继续点击对应阶段按钮推进流程。
                          </Text>
                          <Row gutter={[12, 12]}>
                            <Col span={12}>
                              <Select
                                value={reviewRecommendation}
                                onChange={setReviewRecommendation}
                                options={Object.entries(REVIEW_RECOMMENDATION_MAP).map(([value, label]) => ({ value, label }))}
                              />
                            </Col>
                            <Col span={12}>
                              <InputNumber min={1} max={10} value={overallScore ?? undefined} onChange={(v) => setOverallScore(v == null ? null : Number(v))} placeholder="综合评分" className="w-full" />
                            </Col>
                            <Col span={12}>
                              <InputNumber min={1} max={10} value={originalityScore ?? undefined} onChange={(v) => setOriginalityScore(v == null ? null : Number(v))} placeholder="创新性" className="w-full" />
                            </Col>
                            <Col span={12}>
                              <InputNumber min={1} max={10} value={rigorScore ?? undefined} onChange={(v) => setRigorScore(v == null ? null : Number(v))} placeholder="论证严谨性" className="w-full" />
                            </Col>
                            <Col span={12}>
                              <InputNumber min={1} max={10} value={writingScore ?? undefined} onChange={(v) => setWritingScore(v == null ? null : Number(v))} placeholder="文字与结构" className="w-full" />
                            </Col>
                          </Row>
                          <Input.TextArea rows={3} value={reviewSummary} onChange={(e) => setReviewSummary(e.target.value)} placeholder="总体评价摘要" />
                          <Input.TextArea rows={4} value={reviewMajorIssues} onChange={(e) => setReviewMajorIssues(e.target.value)} placeholder="主要问题" />
                          <Input.TextArea rows={4} value={reviewRequirements} onChange={(e) => setReviewRequirements(e.target.value)} placeholder="修改要求 / 处理建议" />
                          <Input.TextArea rows={3} value={reviewConfidentialNotes} onChange={(e) => setReviewConfidentialNotes(e.target.value)} placeholder="仅编辑部可见备注（可选）" />
                          <Button type="primary" onClick={submitStructuredReview} loading={reviewSubmitLoading}>
                            保存结构化意见
                          </Button>
                        </Space>
                      ) : (
                        <Text type="secondary" className="text-xs">
                          当前阶段未分配给你，仅可查看已提交的审稿意见。
                        </Text>
                      )}
                    </Card>
                  )}

                  {aiError && <Alert message={aiError} type="error" showIcon />}

                  <Card title="引注检查">
                    <Space direction="vertical" size={12} className="flex w-full">
                      <Space wrap size="small" align="center">
                        <Button onClick={runCitationCheck} loading={citationCheckLoading}>
                          {citationCheckLoading ? "检查中…" : "运行引注检查"}
                        </Button>
                        <label className="flex items-center gap-1 text-xs text-[#667085]">
                          <input
                            type="checkbox"
                            checked={citationCheckUseLlm}
                            onChange={(e) => setCitationCheckUseLlm(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          使用大模型辅助
                        </label>
                      </Space>
                      {citationCheckError && <Alert message={citationCheckError} type="error" showIcon />}
                      {citationIssues.length > 0 ? (
                        <Text strong className="text-xs">发现 {citationIssues.length} 处引注问题</Text>
                      ) : !citationCheckLoading ? (
                        <Text type="secondary" className="text-xs">运行后显示结果</Text>
                      ) : null}
                      {citationIssues.length > 0 && (
                        <List
                          size="small"
                          dataSource={citationIssues}
                          className="max-h-[220px] overflow-y-auto"
                          renderItem={(item) => (
                            <List.Item className="!px-0">
                              <div className="w-full text-xs">
                                <Text strong className="text-xs">[{item.location}] </Text>
                                <Text className="text-xs">{item.description}</Text>
                                {item.suggestion ? (
                                  <div className="mt-1 text-[#667085]">建议：{item.suggestion}</div>
                                ) : null}
                              </div>
                            </List.Item>
                          )}
                        />
                      )}
                    </Space>
                  </Card>

                  {aiReport && (
                    <Card title="AI 初审报告" extra={<Button type="link" size="small" onClick={copyReport}>复制</Button>}>
                      <div className="max-h-[320px] overflow-y-auto pr-1 text-xs">
                        <TypewriterMarkdown content={aiReport.content} enabled={reportJustGenerated} />
                      </div>
                    </Card>
                  )}

                  {reviewSubmissions.length > 0 && (
                    <Card title="已提交审稿意见">
                      <List
                        size="small"
                        dataSource={reviewSubmissions}
                        renderItem={(item) => (
                          <List.Item className="!px-0">
                            <div className="w-full text-xs text-[#444]">
                              <div className="flex flex-wrap items-center gap-2">
                                <Tag color="blue">{REVIEW_STAGE_MAP[item.review_stage] ?? item.review_stage}</Tag>
                                <Tag>{REVIEW_RECOMMENDATION_MAP[item.recommendation] ?? item.recommendation}</Tag>
                                <span>{item.reviewer_name}</span>
                                {item.overall_score != null ? <span>综合 {item.overall_score}/10</span> : null}
                              </div>
                              {item.summary ? <div className="mt-2 whitespace-pre-wrap">{item.summary}</div> : null}
                              {item.major_issues ? <div className="mt-1 text-[#666]">主要问题：{item.major_issues}</div> : null}
                              {item.revision_requirements ? <div className="mt-1 text-[#666]">修改建议：{item.revision_requirements}</div> : null}
                              {item.updated_at ? <div className="mt-1 text-[#999]">{String(item.updated_at).slice(0, 16)}</div> : null}
                            </div>
                          </List.Item>
                        )}
                      />
                    </Card>
                  )}

                  {editorActions.length > 0 && (
                    <Card title="操作记录">
                      <List
                        size="small"
                        dataSource={editorActions.slice(0, 5)}
                        renderItem={(a) => (
                          <List.Item className="!px-0">
                            <div className="w-full text-xs">
                              <span>{String(a.action_type)} → {String(a.to_status)}</span>
                              <Text type="secondary" className="block text-xs">
                                {`${String(a.operator_name ?? "")} ${String(a.created_at ?? "").slice(0, 16)}`.trim()}
                              </Text>
                            </div>
                          </List.Item>
                        )}
                      />
                      {editorActions.length > 5 && (
                        <Text type="secondary" className="text-xs">共 {editorActions.length} 条</Text>
                      )}
                    </Card>
                  )}
                </Space>
              </Col>

              <Col xs={24} xl={15}>
                <Space direction="vertical" size={24} className="flex w-full">
                  <Card
                    title="原始稿件"
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
                      <Text type="secondary">当前稿件暂无可阅读版本。</Text>
                    ) : (
                      <Space direction="vertical" size={12} className="flex w-full">
                        <Text type="secondary" className="text-xs">
                          文件：{String(currentVersion.file_name_original || "未命名文件")}
                          {(previewType === "docx" || previewType === "doc") && <span className="ml-2">（可优先使用「PDF 预览」查看版式）</span>}
                        </Text>
                        {previewLoading ? (
                          <div className="flex items-center gap-3 py-12">
                            <Spin />
                            <Text type="secondary">正在加载预览…</Text>
                          </div>
                        ) : null}
                        {previewError ? <Alert message={previewError} type="warning" showIcon /> : null}
                        {!previewLoading && previewType === "pdf" && previewUrl ? (
                          <iframe
                            src={previewUrl}
                            title="原始稿件 PDF 预览"
                            className="h-[68vh] min-h-[420px] w-full rounded border border-[#e8e8e8] bg-white"
                          />
                        ) : null}
                        {!previewLoading && (previewType === "docx" || previewType === "doc") && pdfPreviewUrl ? (
                          <iframe
                            src={pdfPreviewUrl}
                            title="Word 转 PDF 预览"
                            className="h-[68vh] min-h-[420px] w-full rounded border border-[#e8e8e8] bg-white"
                          />
                        ) : null}
                        {!previewLoading && (previewType === "docx" || previewType === "doc") && !pdfPreviewUrl && (
                          <Space direction="vertical" size={12} className="flex w-full">
                            <Button type="primary" onClick={loadPdfPreview} loading={pdfPreviewLoading}>
                              {pdfPreviewLoading ? "正在生成 PDF…" : "转为 PDF 预览"}
                            </Button>
                            {pdfPreviewError && <Alert message={pdfPreviewError} type="warning" showIcon />}
                            {previewType === "docx" && (
                              <div className="max-h-[68vh] overflow-y-auto rounded border border-[#e8e8e8] bg-white p-4 text-sm leading-7 text-[#2c2c2e]">
                                {docxPreviewText ? (
                                  <pre className="whitespace-pre-wrap font-sans">{docxPreviewText}</pre>
                                ) : (
                                  <Text type="secondary">暂无文本预览，请点击「转为 PDF 预览」或下载原稿查看。</Text>
                                )}
                              </div>
                            )}
                            {previewType === "doc" && !docxPreviewText && (
                              <Text type="secondary">.doc 格式可尝试「转为 PDF 预览」（需服务器安装 LibreOffice），或下载原稿查看。</Text>
                            )}
                          </Space>
                        )}
                      </Space>
                    )}
                  </Card>
                </Space>
              </Col>
            </Row>
          )}
        </Space>
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
