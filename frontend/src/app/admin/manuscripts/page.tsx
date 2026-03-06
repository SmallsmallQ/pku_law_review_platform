"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, Input, Modal, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { STATUS_MAP } from "@/lib/constants";
import { adminApi, type AdminManuscriptItem, type SectionItem } from "@/services/api";

const pageSize = 20;

export default function AdminManuscriptsPage() {
  const [list, setList] = useState<AdminManuscriptItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
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

  const columns: ColumnsType<AdminManuscriptItem> = [
    { title: "稿件编号", dataIndex: "manuscript_no", key: "manuscript_no", width: 130 },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (t: string) => <span className="block max-w-[360px] truncate">{t}</span>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (s: string) => <Tag>{STATUS_MAP[s] ?? s}</Tag>,
    },
    { title: "作者", dataIndex: "submitted_by_email", key: "submitted_by_email", width: 200, render: (v: string | null) => v || "—" },
    { title: "栏目", dataIndex: "section_name", key: "section_name", width: 120, render: (v: string | null) => v || "—" },
    { title: "投稿时间", dataIndex: "created_at", key: "created_at", width: 180, render: (v: string) => v?.slice(0, 19) ?? "" },
    {
      title: "操作",
      key: "action",
      width: 320,
      render: (_, record) => (
        <Space wrap>
          <Link href={`/editor/${record.id}`}>详情</Link>
          {record.status !== "revision_requested" && record.status !== "accepted" && record.status !== "rejected" && (
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
          {record.status !== "accepted" && (
            <Button
              size="small"
              type="primary"
              className="!bg-[#8B1538] hover:!bg-[#70122e]"
              onClick={() => runAction(record.id, "accept")}
              loading={actionLoadingId === record.id}
            >
              录用
            </Button>
          )}
          {record.status !== "rejected" && (
            <Button
              size="small"
              danger
              onClick={() => runAction(record.id, "reject")}
              loading={actionLoadingId === record.id}
            >
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
            style={{ width: 130 }}
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
    </div>
  );
}
