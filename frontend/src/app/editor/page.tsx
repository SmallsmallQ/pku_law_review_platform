"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Empty,
  Input,
  List,
  Select,
  Spin,
  Steps,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import type { StepsProps } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import TypewriterMarkdown from "@/components/ui/TypewriterMarkdown";
import { REVIEW_STAGE_MAP, REVIEW_STAFF_ROLES, ROLE_MAP, STATUS_MAP } from "@/lib/constants";
import { editorApi, waitForJob, type EditorManuscriptDetail, type EditorManuscriptItem } from "@/services/api";

const { TextArea } = Input;
const { Paragraph, Title } = Typography;

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

const ACTION_LABEL_MAP: Record<string, string> = {
  revision_request: "发起退修",
  reject: "退稿",
  submit_internal_review: "提交内审结论",
  submit_external_review: "提交外审结论",
  submit_final_submission: "提交终审结论",
  accept: "正式录用",
};

export default function EditorWorkbenchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<EditorManuscriptItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<EditorManuscriptDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReport, setAiReport] = useState<{ content: string; model: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  /** 仅当本稿报告是本次会话中“刚生成”的才启用打字机效果 */
  const [typewriterForReportId, setTypewriterForReportId] = useState<number | null>(null);
  const [revisionDraftLoading, setRevisionDraftLoading] = useState(false);
  const [revisionDraftError, setRevisionDraftError] = useState<string | null>(null);
  const [jobMessage, setJobMessage] = useState<string | null>(null);

  const isReviewStaff = !!user?.role && REVIEW_STAFF_ROLES.includes(user.role as (typeof REVIEW_STAFF_ROLES)[number]);
  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await editorApi.manuscripts({
        page: 1,
        page_size: 100,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      });
      setList(res.items);
      if (res.items.length === 0) {
        setSelectedId(null);
        setDetail(null);
        return;
      }
      if (!selectedId || !res.items.some((i) => i.id === selectedId)) {
        setSelectedId(res.items[0].id);
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : "加载稿件失败");
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, keyword, selectedId]);

  const loadDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    try {
      const d = await editorApi.manuscriptDetail(id);
      setDetail(d);
      const report = d.report;
      setAiReport(report ? { content: String(report.content ?? ""), model: String(report.model ?? "") } : null);
      setAiError(null);
    } catch (e) {
      setDetail(null);
      setAiReport(null);
      message.error(e instanceof Error ? e.message : "加载详情失败");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isReviewStaff) {
      router.push("/");
      return;
    }
    loadList();
  }, [user, authLoading, router, loadList, isReviewStaff]);

  useEffect(() => {
    setTypewriterForReportId(null);
  }, [selectedId]);

  useEffect(() => {
    if (!jobMessage) return;
    const timer = setTimeout(() => setJobMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [jobMessage]);

  useEffect(() => {
    if (!selectedId) return;
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const runAiReview = async () => {
    if (!selectedId) return;
    setAiReviewLoading(true);
    setAiError(null);
    try {
      setJobMessage("已提交 AI 初审任务，正在生成报告…");
      const enqueueRes = await editorApi.enqueueAiReviewJob(selectedId);
      const job = await waitForJob<{ report_id?: number; model?: string }>(enqueueRes.job.id, { timeoutMs: 180000 });
      if (job.status !== "succeeded") {
        throw new Error(job.error || "AI 初审任务执行失败");
      }
      setTypewriterForReportId(selectedId);
      await loadDetail(selectedId);
      message.success("AI 初审报告已生成");
      setJobMessage("AI 初审报告已生成");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "生成失败");
      setJobMessage(null);
    } finally {
      setAiReviewLoading(false);
    }
  };

  const runRevisionDraft = useCallback(async () => {
    if (!selectedId) return;
    setRevisionDraftError(null);
    setRevisionDraftLoading(true);
    try {
      setJobMessage("已提交退修意见草稿任务，正在生成…");
      const enqueueRes = await editorApi.enqueueRevisionDraftJob(selectedId);
      const job = await waitForJob<{ draft?: string }>(enqueueRes.job.id, { timeoutMs: 180000 });
      if (job.status !== "succeeded") {
        throw new Error(job.error || "退修意见草稿生成失败");
      }
      setRevisionComment(String(job.result?.draft || ""));
      message.success("已填入退修意见草稿，可修改后提交");
      setJobMessage("退修意见草稿已生成");
    } catch (e) {
      setRevisionDraftError(e instanceof Error ? e.message : "生成失败");
      setJobMessage(null);
    } finally {
      setRevisionDraftLoading(false);
    }
  }, [selectedId]);

  const manuscript = detail?.manuscript as Record<string, unknown> | undefined;
  const currentVersion = detail?.current_version as Record<string, unknown> | undefined;
  const parsed = detail?.parsed as Record<string, unknown> | undefined;
  const editorActions = useMemo(
    () => detail?.editor_actions ?? [],
    [detail?.editor_actions]
  );
  const status = manuscript?.status as string | undefined;
  const currentStage = manuscript?.current_review_stage as string | undefined;
  const availableActions = detail?.available_actions ?? [];
  const assignments = detail?.assignments ?? [];
  const flowCurrentIndex = currentStage ? STAGE_TO_STEP_INDEX[currentStage] ?? (FLOW_STEP_INDEX[status ?? ""] ?? 0) : (FLOW_STEP_INDEX[status ?? ""] ?? 0);
  const progressItems: NonNullable<StepsProps["items"]> = [
    {
      title: "投稿入库",
      subTitle: "作者提交",
      status: flowCurrentIndex > 0 ? "finish" : "process",
    },
    {
      title: "内审",
      subTitle: currentStage === "internal" ? "当前阶段" : "阶段一",
      status: currentStage === "internal" ? (status === "revision_requested" ? "error" : "process") : flowCurrentIndex > 1 ? "finish" : "wait",
    },
    {
      title: "外审",
      subTitle: currentStage === "external" ? "当前阶段" : "阶段二",
      status: currentStage === "external" ? (status === "revision_requested" ? "error" : "process") : flowCurrentIndex > 2 ? "finish" : "wait",
    },
    {
      title: "终审",
      subTitle: currentStage === "final" ? "当前阶段" : "阶段三",
      status: currentStage === "final" ? (status === "revision_requested" ? "error" : "process") : flowCurrentIndex > 3 ? "finish" : "wait",
    },
    {
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
      status:
        status === "rejected"
          ? "error"
          : ["accepted", "final_submitted"].includes(status ?? "")
            ? "finish"
            : status === "revised_submitted"
              ? "process"
              : "wait",
    },
  ];
  const availableActionLabels = availableActions.map((action) => ACTION_LABEL_MAP[action] ?? action);

  const timelineItems = useMemo(
    () =>
      editorActions.map((a) => ({
        color: "gray",
        children: (
            <div>
            <div className="text-sm text-[#333]">
              {(a.operator_name ? `${String(a.operator_name)} · ` : "") + `${String(a.action_type)}: ${String(a.from_status ?? "-")} → ${String(a.to_status ?? "-")}`}
            </div>
            {a.comment ? (
              <div className="text-xs text-[#666] mt-1 rounded bg-[#fafafa] px-3 py-2">
                <MarkdownRenderer content={String(a.comment)} />
              </div>
            ) : null}
            <div className="text-xs text-[#999] mt-1">{String(a.created_at ?? "").slice(0, 19)}</div>
          </div>
        ),
      })),
    [editorActions]
  );

  if (authLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center bg-[#f5f6f8]">
        <Spin size="large" />
      </div>
    );
  }
  if (!user || !isReviewStaff) return null;

  return (
    <div className="bg-white h-screen text-[#1d1d1f] flex flex-col overflow-hidden">
      <HeaderBar />
      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 flex flex-col min-h-0">
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[320px_minmax(480px,1fr)_340px] gap-8 min-h-0">
          {/* 左侧：列表区 */}
          <section className="flex flex-col h-full border-r border-[#e5e7eb] pr-6 min-h-0">
            <div className="flex items-center justify-between mb-4 mt-2">
               <div className="flex items-center gap-2">
                 <Title level={5} className="!m-0 !font-medium text-gray-900">待审稿件库</Title>
                 <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">共 {list.length} 篇</span>
               </div>
               <Button onClick={loadList} type="text" size="small" className="text-gray-500 hover:text-gray-900 px-1">刷新列表</Button>
            </div>
            
            <div className="space-y-3 mb-4">
              <Input
                placeholder="键入编号或标题搜索..."
                allowClear
                size="large"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={loadList}
                className="bg-gray-50 border-[#e5e7eb] rounded-sm"
              />
              <Select
                placeholder="切换审稿状态筛选"
                allowClear
                size="large"
                className="w-full"
                value={statusFilter || undefined}
                onChange={(v) => setStatusFilter(v ?? "")}
                options={Object.entries(STATUS_MAP).map(([value, label]) => ({ value, label }))}
              />
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
               {loadingList ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <Spin size="default" />
                  <span className="mt-3 text-sm">加载稿件列表中...</span>
                </div>
              ) : (
                <List
                  size="small"
                  dataSource={list}
                  locale={{ emptyText: <div className="text-center py-10 text-gray-400">当前筛选无符合条件的稿件</div> }}
                  renderItem={(item) => (
                    <div
                      className={`mb-3 cursor-pointer p-4 border rounded-sm transition-all duration-200 ${
                        selectedId === item.id 
                          ? "border-[#8B1538] bg-red-50/30 shadow-sm relative after:absolute after:top-0 after:bottom-0 after:left-0 after:w-1 after:bg-[#8B1538]" 
                          : "border-[#e5e7eb] bg-white hover:border-gray-300 hover:shadow-sm"
                      }`}
                      onClick={() => setSelectedId(item.id)}
                    >
                        <div className="flex items-center gap-2 mb-2 w-full max-w-full overflow-hidden">
                          <Tag className="!m-0 rounded-sm border-gray-200 text-gray-600 flex-shrink-0">{STATUS_MAP[item.status] ?? item.status}</Tag>
                          <span className="text-xs text-gray-500 font-mono truncate">{item.manuscript_no}</span>
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 pr-1">{item.title}</h4>
                        {item.current_review_stage && (
                          <div className="mt-3 text-xs text-[#8B1538] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8B1538] shrink-0"></span>
                            {REVIEW_STAGE_MAP[item.current_review_stage] ?? item.current_review_stage}
                          </div>
                        )}
                    </div>
                  )}
                />
              )}
            </div>
          </section>

          {/* 中间：审稿与操作主区 */}
          <section className="flex flex-col h-full border-r border-[#e5e7eb] pr-6 min-h-0">
            {!selectedId ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                 <div className="w-16 h-16 border rounded bg-gray-50 flex items-center justify-center mb-4">
                    <span className="text-xl">📄</span>
                 </div>
                 <p>请在左侧列表选择一份稿件以展开其审稿工作台</p>
              </div>
            ) : loadingDetail ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Spin size="large" />
                <span className="mt-4">加载稿件详情数据中...</span>
              </div>
            ) : (
                <div className="flex flex-col flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
                  <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 pb-2 border-b border-gray-100">
                     <Title level={5} className="!m-0 !font-medium text-gray-900">审稿意见台与流转操作</Title>
                     <Link href={`/editor/${selectedId}`}>
                       <Button size="small" type="primary" className="bg-[#8B1538] hover:!bg-[#A51D45] rounded-sm border-none shadow-sm">阅读排版正文页</Button>
                     </Link>
                  </div>

                  <div className="mb-6 shrink-0 border-b border-[#e5e7eb] pb-5">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-xs font-mono text-gray-500">{String(manuscript?.manuscript_no ?? "")}</span>
                    </div>
                    <div className="font-medium text-lg text-gray-900 leading-snug">{String(manuscript?.title ?? "—")}</div>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      {currentStage && (
                         <div className="text-[#8B1538] text-xs inline-flex items-center">
                            当前阶段：{REVIEW_STAGE_MAP[currentStage] ?? currentStage}
                         </div>
                      )}
                      
                      {assignments.map((item) => (
                        <div key={item.id} className="text-gray-600 text-xs flex items-center gap-1.5">
                          <span className="text-gray-400">•</span>
                          <span className="font-medium">{REVIEW_STAGE_MAP[item.review_stage] ?? item.review_stage}</span> 
                          <span>执行人: {item.reviewer_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {availableActions.includes("revision_request") && (
                    <div className="mb-6 shrink-0">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-sm font-medium text-gray-800">拟定退修意见</span>
                        <Button
                          type="default"
                          size="small"
                          className="text-[#8B1538] border-[#8B1538] hover:!bg-red-50 hover:!text-[#A51D45] hover:!border-[#A51D45] rounded-sm bg-white"
                          onClick={runRevisionDraft}
                          loading={revisionDraftLoading}
                        >
                          {revisionDraftLoading ? "生成中..." : "AI 辅助生成退修意见"}
                        </Button>
                      </div>
                      {revisionDraftError && (
                        <Alert type="error" message={revisionDraftError} className="mb-2 py-1 px-3 text-xs" />
                      )}
                      <TextArea
                        rows={6}
                        value={revisionComment}
                        onChange={(e) => setRevisionComment(e.target.value)}
                        placeholder="在此填写需要作者修改的具体意见。点击下方发起退修后，系统将把意见发送给作者。"
                        className="!rounded-sm !font-sans !bg-gray-50 focus:!bg-white resize-y"
                      />
                    </div>
                  )}

                  <div className="mb-8 shrink-0 border-b border-[#e5e7eb] pb-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="text-sm font-medium text-gray-900">稿件流程进度</div>
                      <Tag bordered={false} className="!m-0 bg-transparent px-0 text-[#1d4ed8]">
                        {STATUS_MAP[status ?? ""] ?? status ?? "—"}
                        {currentStage ? ` · ${REVIEW_STAGE_MAP[currentStage] ?? currentStage}` : ""}
                      </Tag>
                    </div>
                    <Steps
                      current={flowCurrentIndex}
                      size="small"
                      responsive
                      items={[...progressItems]}
                    />
                    <div className="mt-4 text-xs text-[#667085] leading-6">
                      {availableActionLabels.length > 0
                        ? `当前节点可执行：${availableActionLabels.join("、")}`
                        : "当前阶段暂无可直接执行的流程操作，请按审稿进度继续查看或进入详情页处理。"}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0">
                     <div className="flex items-center justify-between mb-3 shrink-0">
                        <Title level={5} className="!m-0 !font-medium text-gray-900 flex items-center gap-2">
                           <span className="text-[#8B1538]">✧</span> AI 初审分析报告
                        </Title>
                        <Button type="dashed" size="small" className="rounded-sm text-gray-600" onClick={runAiReview} loading={aiReviewLoading}>
                          {aiReport ? "重新生成" : "生成初审报告"}
                        </Button>
                     </div>
                     
                     {aiError && <Alert type="error" showIcon message={aiError} className="mb-4 shrink-0" />}
                     {jobMessage && <Alert type="info" showIcon message={jobMessage} className="mb-4 shrink-0" />}
                     
                     {aiReport ? (
                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                           <div className="px-0 py-2 text-xs border-b border-[#e5e7eb] flex justify-between text-gray-500 items-center shrink-0">
                              <span>AI 初审报告</span>
                              <span>模型：{aiReport.model || "未知"}</span>
                           </div>
                           <div className="pt-5 overflow-y-auto flex-1 prose prose-sm prose-red max-w-none prose-p:text-gray-700">
                             <TypewriterMarkdown content={aiReport.content} enabled={typewriterForReportId === selectedId} />
                           </div>
                        </div>
                     ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                           <div className="w-12 h-12 rounded-full bg-red-50 text-[#8B1538] flex items-center justify-center text-xl mb-4">✧</div>
                           <p className="text-gray-500 text-sm mb-4 max-w-xs">使用平台接入的大模型对文章的创新性、规范性和学术价值进行辅助分析，供编辑初筛参考。</p>
                           <Button type="primary" className="bg-[#8B1538] hover:!bg-[#A51D45] rounded-sm border-none shadow-sm" onClick={runAiReview} loading={aiReviewLoading}>
                             生成 AI 初审报告
                           </Button>
                        </div>
                     )}
                  </div>
                </div>
            )}
          </section>

          {/* 右侧：流程与元信息区 */}
          <section className="flex flex-col h-full overflow-y-auto pl-2 min-h-0">
             {!selectedId ? (
                <Empty description="选择左侧稿件后显示" className="mt-20 opacity-50" />
              ) : loadingDetail ? (
                <div className="py-20 text-center">
                  <Spin />
                </div>
              ) : (
	                <div>
	                  <div>
	                    <Title level={5} className="!mb-4 !font-medium text-gray-900">核心元信息</Title>
                      <Descriptions
                        column={1}
                        size="small"
                        className="mb-0"
                        styles={{
                          label: { width: 96, color: "#667085" },
                          content: { color: "#1f2937" },
                        }}
                      >
                        <Descriptions.Item label="当前状态">
                          <Tag className="!m-0 border-gray-200">{STATUS_MAP[status ?? ""] ?? status}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="投稿主账号">{String(manuscript?.submitted_by ?? "—")}</Descriptions.Item>
                        <Descriptions.Item label="各审稿分配">
                          {assignments.length > 0 ? (
                            <div className="space-y-1">
                              {assignments.map((item, idx) => (
                                <div key={idx} className="text-sm text-gray-700">
                                  {REVIEW_STAGE_MAP[item.review_stage] ?? item.review_stage}：<span className="font-medium">{item.reviewer_name}</span>
                                  {item.reviewer_role ? <span className="text-xs text-gray-500 ml-1">({ROLE_MAP[item.reviewer_role] ?? item.reviewer_role})</span> : null}
                                </div>
                              ))}
                            </div>
                          ) : "暂未向任何专家或责编分派"}
                        </Descriptions.Item>
                        <Descriptions.Item label="最新正文稿">
                          {currentVersion ? (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">v{String(currentVersion.version_number)}</div>
                              <div className="break-words">{String(currentVersion.file_name_original ?? "文件")}</div>
                              <a href={editorApi.downloadUrl(selectedId, Number(currentVersion.id))} target="_blank" rel="noopener noreferrer" className="text-[#8B1538] hover:underline text-xs font-medium inline-block mt-1">
                                直达安全下载
                              </a>
                            </div>
                          ) : "—"}
                        </Descriptions.Item>
                      </Descriptions>
	                  </div>

                    <Divider className="!my-6" />

	                  <div>
	                     <Title level={5} className="!mb-4 !font-medium text-gray-900">智能解析摘要</Title>
                       <Paragraph className="!mb-0 !text-sm !leading-7 !text-gray-600">
	                       {String(parsed?.abstract || "文档尚未成功解析，或无法在稿件内定位到摘要词条。")}
	                     </Paragraph>
	                  </div>

                    <Divider className="!my-6" />
	                  
	                  <div>
	                     <Title level={5} className="!mb-4 !font-medium text-gray-900 flex items-center gap-2">系统流转时间线</Title>
	                     {timelineItems.length > 0 ? (
	                         <Timeline items={timelineItems} className="pt-2 pl-1 [&_.ant-timeline-item-content]:ml-6" />
	                     ) : (
	                       <Empty description="暂无操作记录流转" className="py-8" />
	                     )}
	                  </div>
	                </div>
	              )}
	          </section>
        </div>
      </main>
    </div>
  );
}
