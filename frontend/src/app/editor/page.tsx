"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
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
} from "antd";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import TypewriterMarkdown from "@/components/ui/TypewriterMarkdown";
import { STATUS_MAP } from "@/lib/constants";
import { editorApi, type EditorManuscriptItem } from "@/services/api";

const { TextArea } = Input;

export default function EditorWorkbenchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<EditorManuscriptItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
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
      setDetail(d as Record<string, unknown>);
      const report = (d as any).report;
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
    if (!user || (user.role !== "editor" && user.role !== "admin")) {
      router.push("/");
      return;
    }
    loadList();
  }, [user, authLoading, router, loadList]);

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
  const editorActions = (detail?.editor_actions as Record<string, unknown>[]) || [];
  const status = manuscript?.status as string | undefined;

  const timelineItems = useMemo(
    () =>
      editorActions.map((a) => ({
        color: "gray",
        children: (
          <div>
            <div className="text-sm text-[#333]">
              {String(a.action_type)}: {String(a.from_status ?? "-")} → {String(a.to_status ?? "-")}
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
  if (!user || (user.role !== "editor" && user.role !== "admin")) return null;

  return (
    <div className="bg-[#f5f6f8]">
      <HeaderBar />
      <main className="w-full px-5 py-6 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(420px,1fr)_380px]">
          <Card
            size="small"
            title="待审稿件"
            extra={
              <Button size="small" onClick={loadList}>
                刷新
              </Button>
            }
          >
            <Space direction="vertical" className="w-full mb-3">
              <Input
                placeholder="搜索编号/标题"
                allowClear
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={loadList}
              />
              <Select
                placeholder="按状态筛选"
                allowClear
                value={statusFilter || undefined}
                onChange={(v) => setStatusFilter(v ?? "")}
                options={Object.entries(STATUS_MAP).map(([value, label]) => ({ value, label }))}
              />
            </Space>
            {loadingList ? (
              <div className="py-10 text-center">
                <Spin />
              </div>
            ) : (
              <List
                size="small"
                dataSource={list}
                locale={{ emptyText: <Empty description="暂无稿件" /> }}
                renderItem={(item) => (
                  <List.Item
                    className={`cursor-pointer rounded px-2 ${selectedId === item.id ? "bg-[#f6eef1]" : "hover:bg-[#fafafa]"}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[#666]">{item.manuscript_no}</span>
                        <Tag>{STATUS_MAP[item.status] ?? item.status}</Tag>
                      </div>
                      <div className="text-sm text-[#333] mt-1">{item.title}</div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card size="small" title="审稿意见与操作">
            {!selectedId ? (
              <Empty description="请先在左侧选择稿件" />
            ) : loadingDetail ? (
              <div className="py-16 text-center">
                <Spin />
              </div>
            ) : (
              <Space direction="vertical" className="w-full" size="middle">
                <div className="rounded border border-[#ececec] p-3">
                  <div className="text-sm text-[#666] mb-1">当前稿件</div>
                  <div className="font-medium text-[#333]">{String(manuscript?.title ?? "—")}</div>
                  <div className="text-xs text-[#888] mt-1">{String(manuscript?.manuscript_no ?? "")}</div>
                </div>

                <div className="mb-1">
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
                <TextArea
                  rows={7}
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  placeholder="在此填写退修意见（点击“提交退修”时发送给作者）"
                />

                <Space wrap>
                  <Button onClick={() => runAction("revision_request")} loading={actionLoading}>
                    提交退修
                  </Button>
                  <Button danger onClick={() => runAction("reject")} loading={actionLoading}>
                    退稿
                  </Button>
                  <Button
                    type="primary"
                    className="!bg-[#8B1538] hover:!bg-[#70122e]"
                    onClick={() => runAction("accept")}
                    loading={actionLoading}
                  >
                    录用
                  </Button>
                  <Button type="dashed" onClick={runAiReview} loading={aiReviewLoading}>
                    生成 AI 初审报告
                  </Button>
                  <Link href={`/editor/${selectedId}`}>打开完整详情页</Link>
                </Space>

                {aiError ? <Alert type="error" showIcon message={aiError} /> : null}
                {aiReport ? (
                  <div className="rounded border border-[#ececec] p-3 overflow-hidden">
                    <div className="mb-2 text-sm font-medium text-[#333]">
                      AI 初审报告{aiReport.model ? `（${aiReport.model}）` : ""}
                    </div>
                    <div className="h-[52vh] min-h-[320px] max-h-[560px] overflow-y-auto pr-1">
                      <TypewriterMarkdown content={aiReport.content} enabled={typewriterForReportId === selectedId} />
                    </div>
                  </div>
                ) : null}
              </Space>
            )}
          </Card>

          <Card size="small" title="流程与详情">
            {!selectedId ? (
              <Empty description="请先在左侧选择稿件" />
            ) : loadingDetail ? (
              <div className="py-16 text-center">
                <Spin />
              </div>
            ) : (
              <Space direction="vertical" className="w-full" size="middle">
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="稿件编号">{String(manuscript?.manuscript_no ?? "—")}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag>{STATUS_MAP[status ?? ""] ?? status}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="投稿人">{String(manuscript?.submitted_by ?? "—")}</Descriptions.Item>
                  <Descriptions.Item label="当前版本">
                    {currentVersion ? (
                      <Space>
                        <span>
                          v{String(currentVersion.version_number)} / {String(currentVersion.file_name_original ?? "")}
                        </span>
                        <a href={editorApi.downloadUrl(selectedId, Number(currentVersion.id))} target="_blank" rel="noopener noreferrer">
                          下载
                        </a>
                      </Space>
                    ) : (
                      "—"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="解析摘要">{String(parsed?.abstract || "未识别")}</Descriptions.Item>
                  <Descriptions.Item label="关键词">{String(parsed?.keywords || "未识别")}</Descriptions.Item>
                </Descriptions>

                <div>
                  <Typography.Title level={5} className="!mb-3">
                    流程记录
                  </Typography.Title>
                  {timelineItems.length ? <Timeline items={timelineItems} /> : <Empty description="暂无操作记录" />}
                </div>
              </Space>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
