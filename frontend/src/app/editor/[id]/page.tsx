"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AuditOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  FileDoneOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  FloatButton,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Space,
  Splitter,
  Spin,
  Steps,
  Tag,
  Typography,
} from "antd";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import TypewriterMarkdown from "@/components/ui/TypewriterMarkdown";
import CitationChecker from "@/components/CitationChecker";
import { REVIEW_STAGE_MAP, REVIEW_STAFF_ROLES, ROLE_MAP, STATUS_MAP } from "@/lib/constants";
import { editorApi, waitForJob, type EditorManuscriptDetail, type ReviewSubmissionItem } from "@/services/api";

const REVIEW_RECOMMENDATION_MAP: Record<string, string> = {
  accept: "建议通过",
  minor_revision: "建议小修",
  major_revision: "建议大修",
  reject: "建议退稿",
};

const FLOW_STEP_INDEX: Record<string, number> = {
  submitted: 0,
  parsing: 0,
  under_review: 0,
  internal_review: 1,
  external_review: 2,
  final_review: 3,
  revision_requested: 3,
  revised_submitted: 3,
  final_submitted: 4,
  accepted: 4,
  rejected: 4,
};

const STAGE_TO_STEP_INDEX: Record<string, number> = {
  internal: 1,
  external: 2,
  final: 3,
};

const { Paragraph, Text } = Typography;

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
  const [jobMessage, setJobMessage] = useState<string | null>(null);
  
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
  const [citationDrawerOpen, setCitationDrawerOpen] = useState(false);

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
      setJobMessage("已提交 AI 初审任务，正在生成报告…");
      const enqueueRes = await editorApi.enqueueAiReviewJob(Number(id));
      const job = await waitForJob<{ report_id?: number; model?: string }>(enqueueRes.job.id, { timeoutMs: 180000 });
      if (job.status !== "succeeded") {
        throw new Error(job.error || "AI 初审任务执行失败");
      }
      await load();
      setReportJustGenerated(true);
      setJobMessage("AI 初审报告已生成");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "生成失败");
      setJobMessage(null);
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
      setJobMessage("已提交退修意见草稿任务，正在生成…");
      const enqueueRes = await editorApi.enqueueRevisionDraftJob(Number(id));
      const job = await waitForJob<{ draft?: string }>(enqueueRes.job.id, { timeoutMs: 180000 });
      if (job.status !== "succeeded") {
        throw new Error(job.error || "退修意见草稿生成失败");
      }
      setRevisionComment(String(job.result?.draft || ""));
      setJobMessage("退修意见草稿已生成，可继续修改");
    } catch (e) {
      setRevisionDraftError(e instanceof Error ? e.message : "生成失败");
      setJobMessage(null);
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
  const currentStageAssignment = assignments.find((item) => Number(item.reviewer_id) === user?.id && String(item.review_stage) === currentStage);
  const currentUserReview = reviewSubmissions.find((item) => item.reviewer_id === user?.id && item.review_stage === currentStage);
  const flowCurrentIndex = currentStage ? STAGE_TO_STEP_INDEX[currentStage] ?? (FLOW_STEP_INDEX[status ?? ""] ?? 0) : (FLOW_STEP_INDEX[status ?? ""] ?? 0);
  const resultStepIcon =
    status === "accepted"
      ? <CheckCircleFilled className="text-[#16a34a]" />
      : status === "rejected"
        ? <CloseCircleFilled className="text-[#dc2626]" />
        : status === "final_submitted"
          ? <FileDoneOutlined className="text-[#2563eb]" />
          : status === "revised_submitted"
            ? <SyncOutlined className="text-[#d97706]" />
            : <ClockCircleOutlined className="text-[#98a2b3]" />;
  const flowItems = [
    {
      key: "submitted",
      title: "投稿入库",
      subTitle: "作者提交",
      description: status === "draft" ? "稿件仍处于草稿状态，尚未进入正式编审流程。" : "稿件已进入系统，等待编辑部启动流程。",
      icon: <SendOutlined />,
      status: flowCurrentIndex > 0 ? "finish" : (status === "draft" ? "process" : "finish"),
    },
    {
      key: "internal",
      title: "内审",
      subTitle: currentStage === "internal" ? "当前阶段" : "阶段一",
      description: currentStage === "internal"
        ? "当前由内审节点处理，可提交内审结论或发起退修。"
        : "编辑或内审人员进行初步判断与分流。",
      icon: <AuditOutlined />,
      status: currentStage === "internal"
        ? (status === "revision_requested" ? "error" : "process")
        : flowCurrentIndex > 1
          ? "finish"
          : "wait",
    },
    {
      key: "external",
      title: "外审",
      subTitle: currentStage === "external" ? "当前阶段" : "阶段二",
      description: currentStage === "external"
        ? "当前处于外审评议阶段，可提交外审结论或继续推进。"
        : "稿件进入专家外审与复审流转。",
      icon: <FileSearchOutlined />,
      status: currentStage === "external"
        ? (status === "revision_requested" ? "error" : "process")
        : flowCurrentIndex > 2
          ? "finish"
          : "wait",
    },
    {
      key: "final",
      title: "终审",
      subTitle: currentStage === "final" ? "当前阶段" : "阶段三",
      description: status === "revision_requested"
        ? "当前流程在终审节点发出退修，等待作者回传修订稿。"
        : currentStage === "final"
          ? "当前由终审节点处理，可提交成稿或直接录用。"
          : "终审阶段综合前序意见做最终处理。",
      icon: <SafetyCertificateOutlined />,
      status: currentStage === "final"
        ? (status === "revision_requested" ? "error" : "process")
        : flowCurrentIndex > 3
          ? "finish"
          : "wait",
    },
    {
      key: "result",
      title: "结果归档",
      subTitle:
        status === "accepted"
          ? "已录用"
          : status === "final_submitted"
            ? "已提交成稿"
            : status === "rejected"
              ? "已退稿"
              : status === "revised_submitted"
                ? "修订稿已回传"
                : "待完成",
      description:
        status === "accepted"
          ? "稿件已完成录用处理。"
          : status === "final_submitted"
            ? "终审成稿已提交，进入归档环节。"
            : status === "rejected"
              ? "稿件已终止流程。"
              : status === "revised_submitted"
                ? "作者已提交修订稿，等待当前节点继续处理。"
                : "完成终审决定后将在此显示最终处理结果。",
      icon: resultStepIcon,
      status:
        status === "rejected"
          ? "error"
          : ["accepted", "final_submitted"].includes(status ?? "")
            ? "finish"
            : status === "revised_submitted"
              ? "process"
              : "wait",
    },
  ] as const;

  const jumpToAiDetect = useCallback(() => {
    if (!id) return;
    router.push(`/ai-detect?source=editor&manuscriptId=${id}`);
  }, [id, router]);

  const currentStageAction = availableActions.find((action) => action.startsWith("submit_"));
  const helperActions = [
    { key: "ai_review", label: "生成 AI 初审报告", onClick: runAiReview, type: "primary" as const, loading: aiReviewLoading },
    { key: "ai_detect", label: "前往 AI 检测", onClick: jumpToAiDetect },
    { key: "ai_assistant", label: "AI 助手", onClick: () => setAiAssistantOpen(true) },
  ];
  const stageActions = [
    currentStageAction === "submit_internal_review"
      ? { key: "submit_internal_review", label: "提交内审", onClick: () => runAction("submit_internal_review"), type: "primary" as const }
      : null,
    currentStageAction === "submit_external_review"
      ? { key: "submit_external_review", label: "提交外审", onClick: () => runAction("submit_external_review"), type: "primary" as const }
      : null,
    currentStageAction === "submit_final_submission"
      ? { key: "submit_final_submission", label: "提交成稿", onClick: () => runAction("submit_final_submission"), type: "primary" as const }
      : null,
  ].filter(Boolean);
  const interventionActions = [
    availableActions.includes("revision_request")
      ? { key: "revision_request", label: "发起退修", onClick: () => { setRevisionModalOpen(true); setRevisionDraftError(null); } }
      : null,
    availableActions.includes("reject")
      ? { key: "reject", label: "退稿", onClick: () => setRejectConfirmOpen(true), danger: true }
      : null,
  ].filter(Boolean);
  const terminalActions = [
    availableActions.includes("accept")
      ? { key: "accept", label: "录用", onClick: () => runAction("accept"), type: "primary" as const }
      : null,
  ].filter(Boolean);

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
    if (!jobMessage) return;
    const t = setTimeout(() => setJobMessage(null), 4000);
    return () => clearTimeout(t);
  }, [jobMessage]);

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
      setJobMessage("已提交 PDF 预览任务，正在生成版式预览…");
      const enqueueRes = await editorApi.enqueuePreviewPdfJob(Number(id), versionId);
      const job = await waitForJob<{ preview_path?: string }>(enqueueRes.job.id, { timeoutMs: 180000 });
      if (job.status !== "succeeded") {
        throw new Error(job.error || "生成 PDF 失败");
      }
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
      setJobMessage("PDF 预览已生成");
    } catch (e) {
      setPdfPreviewError(e instanceof Error ? e.message : "生成 PDF 预览失败");
      setJobMessage(null);
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

  return (
    <div className="bg-[#f4f6f8]">
      <HeaderBar />
      <main className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8" style={{ height: "calc(100vh - 64px)" }}>
        <Space direction="vertical" size={16} className="flex w-full h-full">
          {successMessage && <Alert message={successMessage} type="success" showIcon />}
          {jobMessage && <Alert message={jobMessage} type="info" showIcon />}

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
            <div className="flex flex-col xl:flex-row gap-6 w-full h-[85vh]">
              {/* 左侧：稿件信息与操作 */}
              <div className="xl:w-[400px] 2xl:w-[480px] shrink-0 overflow-y-auto pr-2 pb-8 h-full"> 
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

                  <Card title="流程进度与操作">
                    <Space direction="vertical" size={16} className="flex w-full">
                      <div className="rounded border border-[#e8eef8] bg-[#fafcff] p-4">
                        <div className="mb-3">
                          <Text strong className="text-sm text-[#1d4ed8]">流程进度</Text>
                          <Text type="secondary" className="block mt-1 text-xs">
                            当前稿件状态：{STATUS_MAP[status ?? ""] ?? status ?? "—"}
                            {currentStage ? ` · ${REVIEW_STAGE_MAP[currentStage] ?? currentStage}` : ""}
                          </Text>
                        </div>
                        <Steps
                          orientation="vertical"
                          size="small"
                          variant="outlined"
                          current={flowCurrentIndex}
                          items={flowItems}
                        />
                      </div>

                      {aiReviewLoading && <Alert message="正在生成 AI 初审报告…" type="info" showIcon />}
                      <Text type="secondary" className="text-xs">
                        下方仅展示当前节点可执行的操作；推进流程前请先确认本阶段审稿意见已保存。
                      </Text>
                      <div className="space-y-4">
                        <div className="rounded border border-[#eef2f6] bg-white p-4">
                          <Text strong className="text-xs text-[#475467]">辅助工具</Text>
                          <Space wrap size="small" className="mt-3">
                            {helperActions.map((action) => (
                              <Button
                                key={action.key}
                                type={action.type}
                                onClick={action.onClick}
                                loading={action.loading}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </Space>
                        </div>

                        {stageActions.length > 0 && (
                          <div className="rounded border border-[#dbe7ff] bg-[#f8fbff] p-4">
                            <Text strong className="text-xs text-[#1d4ed8]">
                              当前阶段推进
                              {currentStage ? ` · ${REVIEW_STAGE_MAP[currentStage] ?? currentStage}` : ""}
                            </Text>
                            <Space wrap size="small" className="mt-3">
                              {stageActions.map((action) => (
                                <Button key={action.key} type={action.type} onClick={action.onClick} disabled={actionLoading}>
                                  {action.label}
                                </Button>
                              ))}
                            </Space>
                          </div>
                        )}

                        {interventionActions.length > 0 && (
                          <div className="rounded border border-[#fde7c2] bg-[#fffaf0] p-4">
                            <Text strong className="text-xs text-[#b45309]">流程干预</Text>
                            <Space wrap size="small" className="mt-3">
                              {interventionActions.map((action) => (
                                <Button
                                  key={action.key}
                                  danger={action.danger}
                                  onClick={action.onClick}
                                  disabled={actionLoading}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </Space>
                          </div>
                        )}

                        {terminalActions.length > 0 && (
                          <div className="rounded border border-[#d9f2e3] bg-[#f6fef9] p-4">
                            <Text strong className="text-xs text-[#15803d]">终局处理</Text>
                            <Space wrap size="small" className="mt-3">
                              {terminalActions.map((action) => (
                                <Button key={action.key} type={action.type} onClick={action.onClick} disabled={actionLoading}>
                                  {action.label}
                                </Button>
                              ))}
                            </Space>
                          </div>
                        )}
                      </div>
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

                  <Card title="智能引注校验">
                    <Space direction="vertical" size={12} className="flex w-full">
                      <Button type="primary" onClick={() => setCitationDrawerOpen(true)}>
                        打开引注检查面板
                      </Button>
                      <Text type="secondary" className="text-xs">
                        支持 CLSCI / 法C扩 / CSSCI集刊 / 华政负面清单等库判定与精确排版。
                      </Text>

                      {citationIssues.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <Text strong className="text-xs text-red-600 block mb-2">历史版本遗留问题 ({citationIssues.length})：</Text>
                          <List
                            size="small"
                            dataSource={citationIssues}
                            className="max-h-[150px] overflow-y-auto"
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
                        </div>
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
              </div>

              {/* 右侧：主览与侧边栏的组合区 */}
              <div style={{ flex: "1 1 auto", minWidth: 0, height: "100%" }}>
                <Splitter>
                  {/* 中间主要区域：原始稿件预览 */}
                  <Splitter.Panel defaultSize="100%" min="30%">
                    <Space direction="vertical" size={24} className="flex h-full w-full">
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
                        className="h-full"
                        styles={{ body: { height: "calc(100% - 56px)", overflowY: "auto" } }}
                      >
                        {!currentVersion ? (
                          <Text type="secondary">当前稿件暂无可阅读版本。</Text>
                        ) : (
                          <Space direction="vertical" size={12} className="flex h-full w-full">
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
                                className="h-full min-h-[600px] w-full rounded border border-[#e8e8e8] bg-white"
                              />
                            ) : null}
                            {!previewLoading && (previewType === "docx" || previewType === "doc") && pdfPreviewUrl ? (
                              <iframe
                                src={pdfPreviewUrl}
                                title="Word 转 PDF 预览"
                                className="h-full min-h-[600px] w-full rounded border border-[#e8e8e8] bg-white"
                              />
                            ) : null}
                            {!previewLoading && (previewType === "docx" || previewType === "doc") && !pdfPreviewUrl && (
                              <Space direction="vertical" size={12} className="flex h-full w-full">
                                <Button type="primary" onClick={loadPdfPreview} loading={pdfPreviewLoading}>
                                  {pdfPreviewLoading ? "正在生成 PDF…" : "转为 PDF 预览"}
                                </Button>
                                {pdfPreviewError && <Alert message={pdfPreviewError} type="warning" showIcon />}
                                {previewType === "docx" && (
                                  <div className="flex-1 overflow-y-auto rounded border border-[#e8e8e8] bg-white p-4 text-sm leading-7 text-[#2c2c2e]">
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
                  </Splitter.Panel>

                  {/* 右侧边栏区域：AI 助手（仅在开启时显示） */}
                  {aiAssistantOpen && (
                    <Splitter.Panel defaultSize={380} min={300} max="50%">
                      <Card 
                        title="AI 助手（基于当前稿件）" 
                        extra={<Button type="link" onClick={() => setAiAssistantOpen(false)}>关闭</Button>}
                        className="h-full ml-4"
                        styles={{ body: { height: "calc(100% - 56px)", overflowY: "auto", display: "flex", flexDirection: "column" } }}
                      >
                        <Typography.Paragraph type="secondary" className="mb-3 text-sm">
                          可基于本稿标题、摘要、关键词与初审报告回答问题。试试：
                        </Typography.Paragraph>
                        <Space direction="vertical" className="mb-4 w-full shrink-0">
                          {["适合哪个栏目？", "根据报告给一段退修意见", "概括主要问题"].map((q) => (
                            <Button key={q} type="link" className="!p-0 !h-auto text-left whitespace-normal text-xs" onClick={() => sendAiChat(q)} disabled={aiChatLoading}>
                              {q}
                            </Button>
                          ))}
                        </Space>
                        {aiChatError && <Alert message={aiChatError} type="error" showIcon className="mb-3 shrink-0" />}
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 mb-3">
                          {aiChatMessages.map((msg, i) => (
                            <div
                              key={i}
                              className={`rounded px-3 py-2 text-sm ${
                                msg.role === "user"
                                  ? "bg-[#e6f4ff] ml-6"
                                  : "bg-[#f5f5f5] mr-6"
                              }`}
                            >
                              <Typography.Text type="secondary" className="text-[11px] uppercase tracking-wider">{msg.role === "user" ? "You" : "AI"}</Typography.Text>
                              <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
                            </div>
                          ))}
                          {aiChatLoading && (
                            <div className="rounded px-3 py-2 bg-[#f5f5f5] mr-6 text-sm flex items-center gap-2">
                              <Spin size="small" /> 思考中…
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col gap-2 pt-2 border-t border-[#e8e8e8]">
                          <Input.TextArea
                            placeholder="输入问题…"
                            value={aiChatInput}
                            onChange={(e) => setAiChatInput(e.target.value)}
                            onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); sendAiChat(aiChatInput); } }}
                            rows={2}
                            disabled={aiChatLoading}
                            className="text-sm"
                          />
                          <Button type="primary" onClick={() => sendAiChat(aiChatInput)} loading={aiChatLoading} block>
                            发送
                          </Button>
                        </div>
                      </Card>
                    </Splitter.Panel>
                  )}
                </Splitter>
              </div>
            </div>
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

      <Drawer
        title="引注格式化与校验"
        placement="right"
        width={500}
        onClose={() => setCitationDrawerOpen(false)}
        open={citationDrawerOpen}
        styles={{ body: { padding: 0 } }}
      >
        <div className="h-full p-6 bg-white">
          <CitationChecker />
        </div>
      </Drawer>

      <FloatButton
        type="primary"
        tooltip="打开 AI 助手"
        description="AI"
        style={{ right: 24, bottom: 96 }}
        onClick={() => setAiAssistantOpen(true)}
      />
    </div>
  );
}
