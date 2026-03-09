"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, Col, Empty, Row, Spin, Statistic, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { adminApi, type AdminManuscriptItem, type AdminStats } from "@/services/api";
import { STATUS_MAP } from "@/lib/constants";

const PENDING_STATUSES = new Set(["submitted", "parsing", "under_review", "revision_requested", "revised_submitted"]);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingList, setPendingList] = useState<AdminManuscriptItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      adminApi.stats(),
      adminApi.manuscripts({ page: 1, page_size: 12 }),
    ])
      .then(([statsRes, manuscriptsRes]) => {
        setStats(statsRes.status === "fulfilled" ? statsRes.value : null);
        if (manuscriptsRes.status === "fulfilled") {
          setPendingList(manuscriptsRes.value.items.filter((m) => PENDING_STATUSES.has(m.status)).slice(0, 8));
        } else {
          setPendingList([]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const pendingColumns: ColumnsType<AdminManuscriptItem> = [
    { title: "编号", dataIndex: "manuscript_no", key: "manuscript_no", width: 130 },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      render: (title: string, record) => (
        <Link href={`/editor/${record.id}`} className="text-[#8B1538] hover:underline">
          {title}
        </Link>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => <Tag>{STATUS_MAP[status] ?? status}</Tag>,
    },
    {
      title: "作者",
      dataIndex: "submitted_by_email",
      key: "submitted_by_email",
      width: 220,
      render: (email: string | null) => email || "—",
    },
    {
      title: "投稿时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (value: string) => value?.slice(0, 19) ?? "",
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      render: (_, record) => <Link href={`/editor/${record.id}`}>处理</Link>,
    },
  ];

  const quickEntries = [
    {
      key: "/admin/manuscripts",
      title: "稿件总览",
      desc: "查看全站稿件并处理退修/录用/退稿",
      value: stats?.manuscripts_pending ?? 0,
      suffix: "待处理",
    },
    {
      key: "/admin/users",
      title: "用户管理",
      desc: "新增、编辑、删除用户账号",
      value: (stats?.users_by_role?.author ?? 0) + (stats?.users_by_role?.editor ?? 0) + (stats?.users_by_role?.admin ?? 0),
      suffix: "用户",
    },
    {
      key: "/admin/sections",
      title: "栏目管理",
      desc: "维护栏目与投稿分类",
      value: stats?.sections_count ?? 0,
      suffix: "栏目",
    },
    {
      key: "/admin/templates",
      title: "退修模板",
      desc: "维护标准化退修意见模板",
      value: stats?.templates_count ?? 0,
      suffix: "模板",
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card size="small">
        <p className="text-red-600 mb-4">加载统计失败</p>
        <Button onClick={load}>重试</Button>
      </Card>
    );
  }

  const statusEntries = Object.entries(stats.manuscripts_by_status).filter(([, c]) => c > 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-[#333] mb-6">仪表盘</h1>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="稿件总数" value={stats.manuscripts_total} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="待处理稿件" value={stats.manuscripts_pending} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="栏目数" value={stats.sections_count} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="退修模板数" value={stats.templates_count} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="作者" value={stats.users_by_role?.author ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="编辑" value={stats.users_by_role?.editor ?? 0} />
          </Card>
        </Col>
      </Row>
      {statusEntries.length > 0 && (
        <Card size="small" title="稿件状态分布" className="mt-6 shadow-sm">
          <div className="flex flex-wrap gap-4">
            {statusEntries.map(([status, count]) => (
              <span key={status} className="rounded bg-[#f0f0f0] px-3 py-1 text-sm text-[#555]">
                {STATUS_MAP[status] ?? status}: {count}
              </span>
            ))}
          </div>
        </Card>
      )}
      <Card size="small" title="快捷入口" className="mt-6 shadow-sm">
        <Row gutter={[12, 12]}>
          {quickEntries.map((item) => (
            <Col key={item.key} xs={24} sm={12}>
              <div className="h-full rounded border border-[#ececec] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Link href={item.key} className="font-semibold text-[#8B1538] hover:underline">
                    {item.title}
                  </Link>
                  <span className="text-xs text-[#666]">
                    {item.value} {item.suffix}
                  </span>
                </div>
                <p className="mb-3 text-sm text-[#666]">{item.desc}</p>
                <Link href={item.key} className="text-sm text-[#8B1538] hover:underline">
                  立即进入
                </Link>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
      <Card
        size="small"
        title="待处理稿件"
        className="mt-6 shadow-sm"
        extra={(
          <Link href="/admin/manuscripts" className="text-[#8B1538] hover:underline">
            查看全部
          </Link>
        )}
      >
        {pendingList.length === 0 ? (
          <Empty description="暂无待处理稿件" />
        ) : (
          <Table<AdminManuscriptItem>
            rowKey="id"
            columns={pendingColumns}
            dataSource={pendingList}
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
          />
        )}
      </Card>
    </div>
  );
}
