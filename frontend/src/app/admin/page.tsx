"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Descriptions, Empty, List, Row, Space, Spin, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  adminApi,
  type AdminManuscriptItem,
  type AdminRecentActionItem,
  type AdminStats,
  type AdminUserItem,
} from "@/services/api";
import { ROLE_MAP, STATUS_MAP } from "@/lib/constants";

const PENDING_STATUSES = new Set(["submitted", "parsing", "under_review", "internal_review", "external_review", "final_review", "revision_requested", "revised_submitted"]);
const ACTION_TYPE_MAP: Record<string, string> = {
  revision_request: "退修",
  reject: "退稿",
  accept: "录用",
  status_change: "改状态",
  submit_internal_review: "内审通过",
  submit_external_review: "外审通过",
  submit_final_submission: "提交成稿",
};

const { Paragraph, Text, Title } = Typography;

function getStatusTagColor(status: string) {
  if (status === "revision_requested") return "orange";
  if (status === "accepted") return "green";
  if (status === "rejected") return "red";
  if (status === "submitted" || status === "parsing") return "processing";
  if (status === "under_review" || status === "internal_review" || status === "external_review" || status === "final_review") {
    return "blue";
  }
  return "default";
}

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
        <Link href={`/editor/${record.id}`} className="text-[#8B1538]">
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
        <Link href={`/editor/${record.manuscript_id}`} className="text-[#8B1538]">
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
      value: Object.values(stats?.users_by_role ?? {}).reduce((sum, count) => sum + count, 0),
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

  const totalUsers = useMemo(
    () => Object.values(stats?.users_by_role ?? {}).reduce((sum, count) => sum + count, 0),
    [stats],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card styles={{ body: { padding: 28 } }}>
        <Space direction="vertical" size={16}>
          <Title level={4} className="!mb-0 !text-[#1f2937]">
            管理数据加载失败
          </Title>
          <Paragraph className="!mb-0 !text-[15px] !leading-7 !text-[#667085]">
            当前未能获取仪表盘统计信息，请重试后继续查看稿件、用户和流程数据。
          </Paragraph>
          <div>
            <Button type="primary" onClick={load}>
              重新加载
            </Button>
          </div>
        </Space>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={24} className="flex w-full">
      <Card styles={{ body: { padding: 28 } }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} xl={15}>
            <Text className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1538]">
              Admin Console
            </Text>
            <Title level={2} className="!mb-2 !mt-3 !text-[#1f2937]">
              管理仪表盘
            </Title>
            <Paragraph className="!mb-0 !max-w-3xl !text-[15px] !leading-8 !text-[#667085]">
              统一查看稿件积压、用户结构、栏目配置和最近处理记录。这里保留现有业务逻辑，只把后台首页收回到 Ant Design
              的工作台式布局，方便继续逐页迁移。
            </Paragraph>
          </Col>
          <Col xs={24} xl={9}>
            <Card size="small" styles={{ body: { padding: 20 } }}>
              <Descriptions
                column={1}
                size="small"
                items={[
                  { key: "pending", label: "当前待处理稿件", children: `${stats.manuscripts_pending} 篇` },
                  { key: "users", label: "系统用户总数", children: `${totalUsers} 人` },
                  { key: "sections", label: "栏目配置数", children: `${stats.sections_count} 个` },
                  { key: "templates", label: "退修模板数", children: `${stats.templates_count} 个` },
                ]}
              />
              <Space wrap className="mt-4">
                <Link href="/admin/manuscripts">
                  <Button type="primary">进入稿件总览</Button>
                </Link>
                <Button onClick={load}>刷新数据</Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card styles={{ body: { padding: 24 } }}>
            <Statistic title="稿件总数" value={stats.manuscripts_total} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card styles={{ body: { padding: 24 } }}>
            <Statistic title="待处理稿件" value={stats.manuscripts_pending} valueStyle={{ color: "#8B1538" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card styles={{ body: { padding: 24 } }}>
            <Statistic title="栏目数" value={stats.sections_count} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card styles={{ body: { padding: 24 } }}>
            <Statistic title="退修模板数" value={stats.templates_count} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card styles={{ body: { padding: 24 } }}>
            <Statistic title="作者" value={stats.users_by_role?.author ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card styles={{ body: { padding: 24 } }}>
            <Statistic
              title="内审 / 外审 / 编辑"
              value={(stats.users_by_role?.internal_reviewer ?? 0) + (stats.users_by_role?.external_reviewer ?? 0) + (stats.users_by_role?.editor ?? 0)}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            title="状态看板"
            extra={<Text className="text-[13px] text-[#667085]">按稿件状态汇总当前工作量</Text>}
          >
            {statusEntries.length === 0 ? (
              <Empty description="暂无稿件数据" />
            ) : (
              <List
                grid={{ gutter: 12, xs: 1, sm: 2, lg: 3 }}
                dataSource={statusEntries}
                renderItem={([status, count]) => (
                  <List.Item>
                    <Link href={`/admin/manuscripts?status=${encodeURIComponent(status)}`} className="block">
                      <Card size="small" styles={{ body: { padding: 18 } }}>
                        <Space direction="vertical" size={10} className="flex w-full">
                          <Tag color={getStatusTagColor(status)} className="m-0 w-fit">
                            {STATUS_MAP[status] ?? status}
                          </Tag>
                          <Text className="text-[28px] font-semibold text-[#1f2937]">{count}</Text>
                          <Text className="text-[13px] text-[#667085]">查看该状态下的稿件列表</Text>
                        </Space>
                      </Card>
                    </Link>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="快捷入口" extra={<Text className="text-[13px] text-[#667085]">常用后台入口</Text>}>
            <List
              dataSource={quickEntries}
              renderItem={(item) => (
                <List.Item>
                  <Link href={item.key} className="block w-full">
                    <Card size="small" styles={{ body: { padding: 18 } }}>
                      <Space direction="vertical" size={8} className="flex w-full">
                        <Space className="w-full justify-between">
                          <Text strong className="text-[#1f2937]">
                            {item.title}
                          </Text>
                          <Tag className="m-0">
                            {item.value} {item.suffix}
                          </Tag>
                        </Space>
                        <Text className="text-[14px] leading-7 text-[#667085]">{item.desc}</Text>
                        <Text className="text-[13px] text-[#8B1538]">进入该模块</Text>
                      </Space>
                    </Card>
                  </Link>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="待处理稿件"
        extra={<Link href="/admin/manuscripts">查看全部</Link>}
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

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title="最近注册用户"
            extra={<Link href="/admin/users">进入用户管理</Link>}
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
            title="最近处理记录"
            extra={<Link href="/admin/manuscripts">进入稿件总览</Link>}
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
    </Space>
  );
}
