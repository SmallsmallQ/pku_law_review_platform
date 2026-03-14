"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Input,
  List,
  Select,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
  message,
  Divider,
} from "antd";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import TypewriterMarkdown from "@/components/ui/TypewriterMarkdown";
import { REVIEW_STAGE_MAP, REVIEW_STAFF_ROLES, ROLE_MAP, STATUS_MAP } from "@/lib/constants";
import { editorApi, type EditorManuscriptDetail, type EditorManuscriptItem } from "@/services/api";

const { TextArea } = Input;
const { Paragraph, Text, Title } = Typography;

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
  const [actionLoading, setActionLoading] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReport, setAiReport] = useState<{ content: string; model: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  /** 仅当本稿报告是本次会话中“刚生成”的才启用打字机效果 */
  const [typewriterForReportId, setTypewriterForReportId] = useState<number | null>(null);
  const [revisionDraftLoading, setRevisionDraftLoading] = useState(false);
  const [revisionDraftError, setRevisionDraftError] = useState<string | null>(null);

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
    if (!selectedId) return;
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const runAction = async (actionType: string) => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      await editorApi.action(selectedId, {
        action_type: actionType,
        comment: actionType === "revision_request" ? (revisionComment.trim() || undefined) : undefined,
      });
      message.success("操作成功");
      if (actionType === "revision_request") setRevisionComment("");
      await loadList();
      await loadDetail(selectedId);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActionLoading(false);
    }
  };

  const runAiReview = async () => {
    if (!selectedId) return;
    setAiReviewLoading(true);
    setAiError(null);
    try {
      const res = await editorApi.generateAiReview(selectedId);
      setAiReport(res);
      setTypewriterForReportId(selectedId);
      message.success("AI 初审报告已生成");
      await loadDetail(selectedId);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setAiReviewLoading(false);
    }
  };

  const runRevisionDraft = useCallback(async () => {
    if (!selectedId) return;
    setRevisionDraftError(null);
    setRevisionDraftLoading(true);
    try {
      const res = await editorApi.revisionDraft(selectedId);
      setRevisionComment(res.draft);
      message.success("已填入退修意见草稿，可修改后提交");
    } catch (e) {
      setRevisionDraftError(e instanceof Error ? e.message : "生成失败");
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

                  <div className="bg-gray-50 border border-gray-200 p-5 rounded-sm mb-6 shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-xs font-mono text-gray-500 bg-white px-2 py-0.5 border rounded-sm">{String(manuscript?.manuscript_no ?? "")}</span>
                    </div>
                    <div className="font-medium text-lg text-gray-900 leading-snug">{String(manuscript?.title ?? "—")}</div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                      {currentStage && (
                         <div className="bg-[#8B1538] text-white text-xs px-2.5 py-1 rounded-sm shadow-sm inline-flex items-center">
                            当前阶段：{REVIEW_STAGE_MAP[currentStage] ?? currentStage}
                         </div>
                      )}
                      
                      {assignments.map((item) => (
                        <div key={item.id} className="bg-white border border-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-sm flex items-center gap-1.5 shadow-sm">
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
                          {revisionDraftLoading ? "智写生成中..." : "✧ AI 智能草拟退修意见"}
                        </Button>
                      </div>
                      {revisionDraftError && (
                        <Alert type="error" message={revisionDraftError} className="mb-2 py-1 px-3 text-xs" />
                      )}
                      <TextArea
                        rows={6}
                        value={revisionComment}
                        onChange={(e) => setRevisionComment(e.target.value)}
                        placeholder="在此撰写需要作者修改的具体意见，支持 Markdown。点击下方「发出退修要求」时将下达给作者..."
                        className="!rounded-sm !font-sans !bg-gray-50 focus:!bg-white resize-y"
                      />
                    </div>
                  )}

                  <div className="mb-8 p-4 border border-blue-100 bg-blue-50/50 rounded-sm shrink-0">
                    <div className="text-xs font-medium text-blue-800 mb-3 uppercase tracking-wider">可用流程动作</div>
                    <div className="flex flex-wrap gap-3">
                      {availableActions.includes("revision_request") && (
                        <Button onClick={() => runAction("revision_request")} loading={actionLoading} className="rounded-sm border-orange-300 text-orange-600 hover:!text-orange-700 hover:!border-orange-400 bg-white shadow-sm font-medium">
                          发出退修要求
                        </Button>
                      )}
                      {availableActions.includes("reject") && (
                        <Button danger onClick={() => runAction("reject")} loading={actionLoading} className="rounded-sm shadow-sm font-medium">
                          直接驳回退稿
                        </Button>
                      )}
                      {availableActions.includes("submit_internal_review") && (
                        <Button type="primary" onClick={() => runAction("submit_internal_review")} loading={actionLoading} className="rounded-sm bg-blue-600 hover:!bg-blue-700 shadow-sm font-medium border-none">
                          转入内部初审
                        </Button>
                      )}
                      {availableActions.includes("submit_external_review") && (
                        <Button type="primary" onClick={() => runAction("submit_external_review")} loading={actionLoading} className="rounded-sm bg-indigo-600 hover:!bg-indigo-700 shadow-sm font-medium border-none">
                          提交专家外审
                        </Button>
                      )}
                      {availableActions.includes("submit_final_submission") && (
                        <Button type="primary" onClick={() => runAction("submit_final_submission")} loading={actionLoading} className="rounded-sm bg-purple-600 hover:!bg-purple-700 shadow-sm font-medium border-none">
                          确认稿件成稿
                        </Button>
                      )}
                      {availableActions.includes("accept") && (
                        <Button type="primary" onClick={() => runAction("accept")} loading={actionLoading} className="rounded-sm bg-emerald-600 hover:!bg-emerald-700 shadow-sm font-medium border-none">
                          正式通过录用
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0">
                     <div className="flex items-center justify-between mb-3 shrink-0">
                        <Title level={5} className="!m-0 !font-medium text-gray-900 flex items-center gap-2">
                           <span className="text-[#8B1538]">✧</span> AI 初审分析报告
                        </Title>
                        <Button type="dashed" size="small" className="rounded-sm text-gray-600" onClick={runAiReview} loading={aiReviewLoading}>
                          {aiReport ? '重新生成' : '开始智能首审'}
                        </Button>
                     </div>
                     
                     {aiError && <Alert type="error" showIcon message={aiError} className="mb-4 shrink-0 rounded-sm" />}
                     
                     {aiReport ? (
                        <div className="flex-1 border border-[#e5e7eb] rounded-sm bg-white overflow-hidden flex flex-col shadow-sm">
                           <div className="bg-gray-50 px-4 py-2 text-xs border-b border-[#e5e7eb] flex justify-between text-gray-500 font-mono items-center shrink-0">
                              <span>GENERATED_REPORT</span>
                              <span>Model: {aiReport.model || 'Unknown'}</span>
                           </div>
                           <div className="p-5 overflow-y-auto flex-1 prose prose-sm prose-red max-w-none prose-p:text-gray-700">
                             <TypewriterMarkdown content={aiReport.content} enabled={typewriterForReportId === selectedId} />
                           </div>
                        </div>
                     ) : (
                        <div className="flex-1 border border-dashed border-gray-300 rounded-sm bg-gray-50/50 flex flex-col items-center justify-center p-8 text-center">
                           <div className="w-12 h-12 rounded-full bg-red-50 text-[#8B1538] flex items-center justify-center text-xl mb-4">✧</div>
                           <p className="text-gray-500 text-sm mb-4 max-w-xs">使用平台接入的AI大模型对文章的创新性、规范性和学术价值进行快速初筛分析。</p>
                           <Button type="primary" className="bg-[#8B1538] hover:!bg-[#A51D45] rounded-sm border-none shadow-sm" onClick={runAiReview} loading={aiReviewLoading}>
                             一键生成 AI 初审
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
                <div className="space-y-8">
                  <div>
                    <Title level={5} className="!mb-4 !font-medium text-gray-900">核心元信息</Title>
                    <div className="border border-[#e5e7eb] rounded-sm overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-[#e5e7eb]">
                          <tr>
                            <th className="py-2.5 px-4 bg-gray-50 text-gray-500 font-medium w-24">当前状态</th>
                            <td className="py-2.5 px-4"><Tag className="!m-0 rounded-sm border-gray-200">{STATUS_MAP[status ?? ""] ?? status}</Tag></td>
                          </tr>
                          <tr>
                            <th className="py-2.5 px-4 bg-gray-50 text-gray-500 font-medium whitespace-nowrap">投稿主账号</th>
                            <td className="py-2.5 px-4 truncate text-gray-800">{String(manuscript?.submitted_by ?? "—")}</td>
                          </tr>
                          <tr>
                            <th className="py-2.5 px-4 bg-gray-50 text-gray-500 font-medium align-top">各审稿分配</th>
                            <td className="py-2.5 px-4 text-gray-800 leading-relaxed">
                              {assignments.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-1 m-0 break-words pr-2">
                                  {assignments.map((item, idx) => (
                                    <li key={idx} className="marker:text-gray-300 relative text-gray-700">
                                      {REVIEW_STAGE_MAP[item.review_stage] ?? item.review_stage}: <span className="font-medium whitespace-nowrap">{item.reviewer_name}</span>
                                      {item.reviewer_role && <span className="text-gray-500 text-xs ml-1 block mt-0.5">({ROLE_MAP[item.reviewer_role] ?? item.reviewer_role})</span>}
                                    </li>
                                  ))}
                                </ul>
                              ) : "暂未向任何专家或责编分派"}
                            </td>
                          </tr>
                          <tr>
                            <th className="py-3 px-4 bg-gray-50 text-gray-500 font-medium align-top w-24 whitespace-nowrap">最新正文稿</th>
                            <td className="py-3 px-4 text-gray-800 break-words pr-2">
                              {currentVersion ? (
                                <div className="space-y-1">
                                  <div className="text-xs font-mono bg-gray-100 p-1 px-1.5 rounded inline-block w-fit mr-1.5">v{String(currentVersion.version_number)}</div>
                                  <span className="break-words leading-tight block">{String(currentVersion.file_name_original ?? "文件")}</span>
                                  <a href={editorApi.downloadUrl(selectedId, Number(currentVersion.id))} target="_blank" rel="noopener noreferrer" className="text-[#8B1538] hover:underline hover:text-[#A51D45] text-xs font-medium inline-block mt-1 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                    直达安全下载
                                  </a>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                     <Title level={5} className="!mb-4 !font-medium text-gray-900 border-t border-[#e5e7eb] pt-6">智能解析摘要</Title>
                     <p className="text-sm text-gray-600 leading-relaxed bg-blue-50/30 p-4 border border-blue-100 rounded-sm">
                       {String(parsed?.abstract || "文档尚未成功解析，或无法在稿件内定位到摘要词条。")}
                     </p>
                  </div>
                  
                  <div>
                     <Title level={5} className="!mb-4 !font-medium text-gray-900 border-t border-[#e5e7eb] pt-6 flex items-center gap-2">系统流转时间线</Title>
                     {timelineItems.length > 0 ? (
                       <div className="bg-gray-50 p-5 rounded-sm border border-gray-200 shadow-inner">
                         <Timeline items={timelineItems} className="pt-2 pl-1 [&_.ant-timeline-item-content]:ml-6" />
                       </div>
                     ) : (
                       <Empty description="暂无操作记录流转" className="border border-dashed border-gray-200 py-8 rounded-sm bg-gray-50/50" />
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
