"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import { STATUS_MAP } from "@/lib/constants";
import { editorApi, type EditorManuscriptItem } from "@/services/api";

const pageSize = 20;

export default function EditorWorkbenchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<EditorManuscriptItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== "editor" && user.role !== "admin")) {
      router.push("/");
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await editorApi.manuscripts({
          page,
          page_size: pageSize,
          ...(statusFilter ? { status: statusFilter } : {}),
        });
        setList(res.items);
        setTotal(res.total);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, page, statusFilter, router]);

  if (authLoading) return null;
  if (user && user.role !== "editor" && user.role !== "admin") return null;

  const columns: ColumnsType<EditorManuscriptItem> = [
    { title: "稿件编号", dataIndex: "manuscript_no", key: "manuscript_no", width: 120 },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (t: string) => <span className="max-w-xs truncate block">{t}</span>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s: string) => (
        <span className="rounded bg-[#f0f0f0] px-2 py-0.5 text-xs text-[#555]">
          {STATUS_MAP[s] ?? s}
        </span>
      ),
    },
    { title: "投稿人 ID", dataIndex: "submitted_by", key: "submitted_by", width: 100 },
    {
      title: "投稿时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (v: string) => v?.slice(0, 19) ?? "",
    },
    {
      title: "操作",
      key: "actions",
      width: 80,
      render: (_, r) => <Link href={`/editor/${r.id}`}>详情</Link>,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <HeaderBar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card
          title="编辑工作台"
          extra={
            <Space align="center">
              <Typography.Text type="secondary">状态筛选：</Typography.Text>
              <Select
                value={statusFilter || undefined}
                onChange={(v) => {
                  setStatusFilter(v || "");
                  setPage(1);
                }}
                placeholder="全部"
                style={{ width: 120 }}
                allowClear
                options={Object.entries(STATUS_MAP).map(([k, v]) => ({ label: v, value: k }))}
              />
            </Space>
          }
        >
          <Table<EditorManuscriptItem>
            rowKey="id"
            columns={columns}
            dataSource={list}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: false,
              showTotal: (t) => `共 ${t} 条`,
              onChange: setPage,
            }}
          />
        </Card>
      </div>
    </div>
  );
}
