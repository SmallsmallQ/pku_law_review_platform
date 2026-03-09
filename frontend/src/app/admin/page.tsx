"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Empty, Row, Spin, Statistic, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  adminApi,
  type AdminManuscriptItem,
  type AdminRecentActionItem,
  type AdminStats,
  type AdminUserItem,
} from "@/services/api";
import { STATUS_MAP } from "@/lib/constants";

const PENDING_STATUSES = new Set(["submitted", "parsing", "under_review", "revision_requested", "revised_submitted"]);
const ACTION_TYPE_MAP: Record<string, string> = {
  revision_request: "退修",
  reject: "退稿",
  accept: "录用",
  status_change: "改状态",
};
const ROLE_MAP: Record<string, string> = {
  author: "作者",
  editor: "编辑",
  admin: "管理员",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingList, setPendingList] = useState<AdminManuscriptItem[]>([]);
  const [recentUsers, setRecentUsers] = useState<AdminUserItem[]>([]);
  const [recentActions, setRecentActions] = useState<AdminRecentActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      adminApi.stats(),
      adminApi.manuscripts({ page: 1, page_size: 16 }),
      adminApi.recentUsers({ limit: 8 }),
      adminApi.recentActions({ limit: 10 }),
    ])
      .then(([statsRes, manuscriptsRes, usersRes, actionsRes]) => {
        setStats(statsRes.status === "fulfilled" ? statsRes.value : null);
        if (manuscriptsRes.status === "fulfilled") {
          setPendingList(manuscriptsRes.value.items.filter((m) => PENDING_STATUSES.has(m.status)).slice(0, 8));
        } else {
          setPendingList([]);
        }
        setRecentUsers(usersRes.status === "fulfilled" ? usersRes.value.items : []);
        setRecentActions(actionsRes.status === "fulfilled" ? actionsRes.value.items : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const recentUsersColumns: ColumnsType<AdminUserItem> = [
    { title: "邮箱", dataIndex: "email", key: "email", width: 250 },
    {
      title: "姓名",
      dataIndex: "real_name",
      key: "real_name",
      width: 120,
      render: (name: string | null) => name || "—",
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 110,
      render: (role: string) => <Tag color={role === "admin" ? "red" : role === "editor" ? "blue" : "default"}>{ROLE_MAP[role] ?? role}</Tag>,
    },
    {
      title: "状态",
      dataIndex: "is_active",
      key: "is_active",
      width: 90,
      render: (active: boolean) => (active ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (value: string) => value?.slice(0, 19) ?? "",
    },
  ];

  const recentActionsColumns: ColumnsType<AdminRecentActionItem> = [
    {
      title: "时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (value: string) => value?.slice(0, 19) ?? "",
    },
    {
      title: "稿件",
      key: "manuscript",
      render: (_, record) => (
        <Link href={`/editor/${record.manuscript_id}`} className="text-[#8B1538] hover:underline">
          {record.manuscript_no || `#${record.manuscript_id}`}
        </Link>
      ),
    },
    {
      title: "操作",
      dataIndex: "action_type",
      key: "action_type",
      width: 100,
      render: (actionType: string) => <Tag>{ACTION_TYPE_MAP[actionType] ?? actionType}</Tag>,
    },
    {
      title: "状态变化",
      key: "status_change",
      width: 220,
      render: (_, record) => (
        <span className="text-xs text-[#555]">
          {(record.from_status ? STATUS_MAP[record.from_status] ?? record.from_status : "-")}
          {" -> "}
          {(record.to_status ? STATUS_MAP[record.to_status] ?? record.to_status : "-")}
        </span>
      ),
    },
    {
      title: "处理人",
      key: "editor",
      width: 220,
      render: (_, record) => record.editor_name || record.editor_email || `#${record.editor_id}`,
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

  const statusEntries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.manuscripts_by_status)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [stats]);

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[#333]">仪表盘</h1>
        <Button onClick={load}>刷新数据</Button>
      </div>
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

      <Card size="small" title="状态看板" className="mt-6 shadow-sm">
        {statusEntries.length === 0 ? (
          <Empty description="暂无稿件数据" />
        ) : (
          <div className="flex flex-wrap gap-3">
            {statusEntries.map(([status, count]) => (
              <Link
                key={status}
                href={`/admin/manuscripts?status=${encodeURIComponent(status)}`}
                className="rounded border border-[#e6e6e6] bg-[#fafafa] px-3 py-2 text-sm text-[#444] hover:border-[#8B1538] hover:text-[#8B1538]"
              >
                {STATUS_MAP[status] ?? status}: {count}
              </Link>
            ))}
          </div>
        )}
      </Card>

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

      <Row gutter={[16, 16]} className="mt-2">
        <Col xs={24} xl={12}>
          <Card
            size="small"
            title="最近注册用户"
            className="mt-4 shadow-sm"
            extra={(
              <Link href="/admin/users" className="text-[#8B1538] hover:underline">
                进入用户管理
              </Link>
            )}
          >
            {recentUsers.length === 0 ? (
              <Empty description="暂无用户数据" />
            ) : (
              <Table<AdminUserItem>
                rowKey="id"
                columns={recentUsersColumns}
                dataSource={recentUsers}
                pagination={false}
                size="small"
                scroll={{ x: "max-content" }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card
            size="small"
            title="最近处理记录"
            className="mt-4 shadow-sm"
            extra={(
              <Link href="/admin/manuscripts" className="text-[#8B1538] hover:underline">
                进入稿件总览
              </Link>
            )}
          >
            {recentActions.length === 0 ? (
              <Empty description="暂无处理记录" />
            ) : (
              <Table<AdminRecentActionItem>
                rowKey="id"
                columns={recentActionsColumns}
                dataSource={recentActions}
                pagination={false}
                size="small"
                scroll={{ x: "max-content" }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
