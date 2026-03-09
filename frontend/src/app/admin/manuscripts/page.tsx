"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, Input, Modal, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { REVIEW_STAGE_MAP, ROLE_MAP, STATUS_MAP } from "@/lib/constants";
import { adminApi, type AdminManuscriptItem, type AdminUserItem, type SectionItem } from "@/services/api";

const pageSize = 20;

export default function AdminManuscriptsPage() {
  const [list, setList] = useState<AdminManuscriptItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [reviewers, setReviewers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [revisionTargetId, setRevisionTargetId] = useState<number | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AdminManuscriptItem | null>(null);
  const [assignStage, setAssignStage] = useState<string>("internal");
  const [assignReviewerId, setAssignReviewerId] = useState<number | null>(null);
  const [assignNote, setAssignNote] = useState("");
  const [activateStage, setActivateStage] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi
      .manuscripts({
        page,
        page_size: pageSize,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(sectionFilter ? { section_id: Number(sectionFilter) } : {}),
        ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      })
      .then((res) => {
        setList(res.items);
        setTotal(res.total);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, statusFilter, sectionFilter, keyword]);

  useEffect(() => {
    adminApi.sections().then((res) => setSections(res.items)).catch(() => setSections([]));
    adminApi.users({ page_size: 200, is_active: true }).then((res) => setReviewers(res.items)).catch(() => setReviewers([]));
  }, []);

  const runAction = (id: number, actionType: string, comment?: string) => {
    setActionLoadingId(id);
    adminApi
      .manuscriptAction(id, { action_type: actionType, comment })
      .then(() => {
        message.success("操作成功");
        load();
      })
      .catch((e) => message.error(e?.message || "操作失败"))
      .finally(() => setActionLoadingId(null));
  };

  const eligibleReviewers = useMemo(() => {
    const allowedRoles =
      assignStage === "internal"
        ? ["internal_reviewer", "editor", "admin"]
        : assignStage === "external"
          ? ["external_reviewer", "editor", "admin"]
          : ["editor", "admin"];
    return reviewers.filter((item) => allowedRoles.includes(item.role));
  }, [assignStage, reviewers]);

  const openAssignModal = (record: AdminManuscriptItem, stage?: string) => {
    const nextStage = stage || record.current_review_stage || "internal";
    const existing = record.assignments.find((item) => item.review_stage === nextStage);
    setAssignTarget(record);
    setAssignStage(nextStage);
    setAssignReviewerId(existing?.reviewer_id ?? null);
    setAssignNote(existing?.note ?? "");
    setActivateStage(true);
    setAssignModalOpen(true);
  };

  const submitAssignment = async () => {
    if (!assignTarget || !assignReviewerId) {
      message.warning("请先选择审稿人");
      return;
    }
    setActionLoadingId(assignTarget.id);
    try {
      await adminApi.assignManuscript(assignTarget.id, {
        review_stage: assignStage,
        reviewer_id: assignReviewerId,
        note: assignNote.trim() || undefined,
        activate_stage: activateStage,
      });
      message.success("分配成功");
      setAssignModalOpen(false);
      setAssignTarget(null);
      setAssignReviewerId(null);
      setAssignNote("");
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "分配失败");
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: ColumnsType<AdminManuscriptItem> = [
    { title: "稿件编号", dataIndex: "manuscript_no", key: "manuscript_no", width: 130 },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (t: string) => <span className="block max-w-[300px] truncate">{t}</span>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string) => <Tag>{STATUS_MAP[s] ?? s}</Tag>,
    },
    {
      title: "当前阶段",
      dataIndex: "current_review_stage",
      key: "current_review_stage",
      width: 100,
      render: (stage: string | null) => (stage ? <Tag color="blue">{REVIEW_STAGE_MAP[stage] ?? stage}</Tag> : "—"),
    },
    {
      title: "审稿分配",
      key: "assignments",
      width: 260,
      render: (_, record) => (
        <div className="space-y-1 text-xs">
          {record.assignments.length === 0 ? (
            <span className="text-[#999]">未分配</span>
          ) : (
            record.assignments.map((item) => (
              <div key={item.id}>
                <span className="font-medium">{REVIEW_STAGE_MAP[item.review_stage] ?? item.review_stage}</span>
                {"："}
                {item.reviewer_name}
                {item.reviewer_role ? `（${ROLE_MAP[item.reviewer_role] ?? item.reviewer_role}）` : ""}
              </div>
            ))
          )}
        </div>
      ),
    },
    { title: "作者", dataIndex: "submitted_by_email", key: "submitted_by_email", width: 180, render: (v: string | null) => v || "—" },
    { title: "栏目", dataIndex: "section_name", key: "section_name", width: 120, render: (v: string | null) => v || "—" },
    {
      title: "操作",
      key: "action",
      width: 360,
      render: (_, record) => (
        <Space wrap>
          <Link href={`/editor/${record.id}`}>详情</Link>
          <Button size="small" onClick={() => openAssignModal(record)} loading={actionLoadingId === record.id}>
            分配审稿人
          </Button>
          {record.current_review_stage === "internal" && (
            <Button size="small" type="primary" className="!bg-[#8B1538] hover:!bg-[#70122e]" onClick={() => runAction(record.id, "submit_internal_review")} loading={actionLoadingId === record.id}>
              内审通过
            </Button>
          )}
          {record.current_review_stage === "external" && (
            <Button size="small" type="primary" className="!bg-[#8B1538] hover:!bg-[#70122e]" onClick={() => runAction(record.id, "submit_external_review")} loading={actionLoadingId === record.id}>
              外审通过
            </Button>
          )}
          {record.current_review_stage === "final" && (
            <Button size="small" type="primary" className="!bg-[#8B1538] hover:!bg-[#70122e]" onClick={() => runAction(record.id, "submit_final_submission")} loading={actionLoadingId === record.id}>
              提交成稿
            </Button>
          )}
          {record.status !== "revision_requested" && record.status !== "rejected" && record.status !== "final_submitted" && (
            <Button
              size="small"
              onClick={() => {
                setRevisionTargetId(record.id);
                setRevisionComment("");
                setRevisionModalOpen(true);
              }}
              loading={actionLoadingId === record.id}
            >
              退修
            </Button>
          )}
          {record.status !== "rejected" && (
            <Button size="small" danger onClick={() => runAction(record.id, "reject")} loading={actionLoadingId === record.id}>
              退稿
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-[#333] mb-4">稿件总览</h1>
      <Card size="small" className="mb-4">
        <Space wrap>
          <Input
            placeholder="搜索编号/标题/作者邮箱"
            allowClear
            value={keyword}
            onChange={(e) => {
              setPage(1);
              setKeyword(e.target.value);
            }}
            style={{ width: 260 }}
          />
          <Select
            placeholder="状态"
            allowClear
            value={statusFilter || undefined}
            onChange={(v) => {
              setPage(1);
              setStatusFilter(v ?? "");
            }}
            style={{ width: 150 }}
            options={Object.entries(STATUS_MAP).map(([value, label]) => ({ value, label }))}
          />
          <Select
            placeholder="栏目"
            allowClear
            value={sectionFilter || undefined}
            onChange={(v) => {
              setPage(1);
              setSectionFilter(v ?? "");
            }}
            style={{ width: 180 }}
            options={sections.map((s) => ({ value: String(s.id), label: s.name }))}
          />
        </Space>
      </Card>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{ current: page, pageSize, total, onChange: setPage }}
        size="small"
        scroll={{ x: "max-content" }}
      />

      <Modal
        title="提交退修意见"
        open={revisionModalOpen}
        onCancel={() => {
          setRevisionModalOpen(false);
          setRevisionTargetId(null);
          setRevisionComment("");
        }}
        onOk={() => {
          if (!revisionTargetId) return;
          runAction(revisionTargetId, "revision_request", revisionComment.trim() || undefined);
          setRevisionModalOpen(false);
          setRevisionTargetId(null);
          setRevisionComment("");
        }}
        okText="提交"
        cancelText="取消"
      >
        <textarea
          rows={5}
          className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[#333] focus:border-[#8B1538] focus:outline-none focus:ring-1 focus:ring-[#8B1538]"
          placeholder="请输入退修意见（可选）"
          value={revisionComment}
          onChange={(e) => setRevisionComment(e.target.value)}
        />
      </Modal>

      <Modal
        title="分配审稿人"
        open={assignModalOpen}
        onCancel={() => {
          setAssignModalOpen(false);
          setAssignTarget(null);
          setAssignReviewerId(null);
          setAssignNote("");
        }}
        onOk={submitAssignment}
        okText="保存分配"
        cancelText="取消"
        confirmLoading={assignTarget ? actionLoadingId === assignTarget.id : false}
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-sm text-[#666]">审稿阶段</div>
            <Select value={assignStage} onChange={(value) => { setAssignStage(value); setAssignReviewerId(null); }} className="w-full">
              <Select.Option value="internal">内审</Select.Option>
              <Select.Option value="external">外审</Select.Option>
              <Select.Option value="final">终审</Select.Option>
            </Select>
          </div>
          <div>
            <div className="mb-1 text-sm text-[#666]">审稿人</div>
            <Select
              showSearch
              optionFilterProp="label"
              value={assignReviewerId ?? undefined}
              onChange={(value) => setAssignReviewerId(value)}
              className="w-full"
              options={eligibleReviewers.map((item) => ({
                value: item.id,
                label: `${item.real_name || item.email} · ${ROLE_MAP[item.role] ?? item.role}`,
              }))}
            />
          </div>
          <div>
            <div className="mb-1 text-sm text-[#666]">备注</div>
            <Input.TextArea rows={3} value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="可填写审稿要求或说明" />
          </div>
          <Checkbox checked={activateStage} onChange={(e) => setActivateStage(e.target.checked)}>
            立即切换稿件到该审稿阶段
          </Checkbox>
        </div>
      </Modal>
    </div>
  );
}
