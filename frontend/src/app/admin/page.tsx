"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Descriptions, Empty, Space, Spin, Statistic, Table, Tag, Typography } from "antd";
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
      <div className="bg-white p-8 sm:p-12 min-h-[50vh] flex flex-col justify-center border border-[#e5e7eb] rounded-sm m-6">
        <Space direction="vertical" size={16} className="max-w-xl mx-auto text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <Title level={3} className="!mb-0 !text-gray-900 !font-medium">
            管理数据加载失败
          </Title>
          <Paragraph className="!text-base !leading-relaxed !text-gray-500">
            当前未能获取仪表盘统计信息，请检查网络或后端服务后重试。
          </Paragraph>
          <div className="mt-4">
            <Button type="primary" size="large" onClick={load} className="bg-[#8B1538] hover:!bg-[#A51D45] border-none shadow-sm px-8 rounded-sm">
              重新加载 Dashboard
            </Button>
          </div>
        </Space>
      </div>
    );
  }

  return (
    <div className="bg-white w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-10 min-h-screen text-[#1d1d1f]">
      {/* Header Section */}
      <section className="pb-6 border-b border-[#e5e7eb]">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="max-w-3xl">
            <Text className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1538] mb-2 block">
              Admin Console
            </Text>
            <Title level={1} className="!mb-3 !font-medium !text-[#1f2937]">
              管理仪表盘
            </Title>
            <Paragraph className="!mb-0 !text-[15px] !leading-relaxed !text-[#6b7280]">
              统一查看稿件积压、用户结构、栏目配置和最近处理记录。保留现有业务逻辑，后台首页同样回归无卡片的扁平化结构。
            </Paragraph>
          </div>
          <Card className="shrink-0" styles={{ body: { padding: 16 } }}>
            <Descriptions column={2} size="small" className="mb-0">
              <Descriptions.Item label="待处理稿件">{stats.manuscripts_pending} 篇</Descriptions.Item>
              <Descriptions.Item label="系统总用户">{totalUsers} 人</Descriptions.Item>
              <Descriptions.Item label="栏目配置数">{stats.sections_count} 个</Descriptions.Item>
              <Descriptions.Item label="退修模板数">{stats.templates_count} 个</Descriptions.Item>
            </Descriptions>
            <Space className="mt-4">
              <Link href="/admin/manuscripts">
                <Button type="primary" size="small" className="bg-[#8B1538] hover:!bg-[#A51D45] border-none shadow-sm">稿件总览</Button>
              </Link>
              <Button size="small" onClick={load}>刷新数据</Button>
            </Space>
          </Card>
        </div>
      </section>

      {/* Statistics Section */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <Card size="small" styles={{ body: { padding: 20 } }}>
              <Statistic title={<span className="text-gray-500 text-sm mb-1 block">全站稿件总数</span>} value={stats.manuscripts_total} valueStyle={{ fontSize: '28px', fontWeight: 600, color: '#111827' }} />
            </Card>
            <Card size="small" className="border-red-100 bg-red-50" styles={{ body: { padding: 20 } }}>
              <Statistic title={<span className="text-red-800/70 text-sm mb-1 block font-medium">积压待办稿件</span>} value={stats.manuscripts_pending} valueStyle={{ fontSize: '28px', fontWeight: 600, color: '#8B1538' }} />
            </Card>
            <Card size="small" styles={{ body: { padding: 20 } }}>
              <Statistic title={<span className="text-gray-500 text-sm mb-1 block">收录总栏目数</span>} value={stats.sections_count} valueStyle={{ fontSize: '28px', fontWeight: 600, color: '#111827' }} />
            </Card>
            <Card size="small" styles={{ body: { padding: 20 } }}>
              <Statistic title={<span className="text-gray-500 text-sm mb-1 block">预设退修模板</span>} value={stats.templates_count} valueStyle={{ fontSize: '28px', fontWeight: 600, color: '#111827' }} />
            </Card>
            <Card size="small" styles={{ body: { padding: 20 } }}>
              <Statistic title={<span className="text-gray-500 text-sm mb-1 block">作者基数</span>} value={stats.users_by_role?.author ?? 0} valueStyle={{ fontSize: '28px', fontWeight: 600, color: '#111827' }} />
            </Card>
            <Card size="small" className="border-blue-100 bg-blue-50" styles={{ body: { padding: 20 } }}>
              <Statistic 
                title={<span className="text-blue-800/70 text-sm mb-1 block font-medium">编辑专家梯队</span>} 
                value={(stats.users_by_role?.internal_reviewer ?? 0) + (stats.users_by_role?.external_reviewer ?? 0) + (stats.users_by_role?.editor ?? 0)} 
                valueStyle={{ fontSize: '28px', fontWeight: 600, color: '#1d4ed8' }} 
              />
            </Card>
        </div>
      </section>

      {/* Main Boards Section */}
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">
          <div className="flex flex-col">
             <div className="flex items-center justify-between mb-4 border-b border-[#e5e7eb] pb-2">
                <Title level={4} className="!m-0 !font-medium text-gray-900 border-l-4 border-[#8B1538] pl-3">状态分布看板</Title>
                <Text className="text-sm text-gray-500">按状态汇总当前实况</Text>
             </div>
             
             {statusEntries.length === 0 ? (
               <div className="bg-gray-50 border border-dashed border-gray-300 rounded-sm py-16 text-center text-gray-400">
                  <Empty description="暂无细分稿件状态分布" />
               </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {statusEntries.map(([status, count]) => (
                    <Link key={status} href={`/admin/manuscripts?status=${encodeURIComponent(status)}`} className="block group">
                      <div className="bg-white border border-[#e5e7eb] p-5 rounded-sm shadow-sm transition-all group-hover:border-gray-400 group-hover:shadow-md h-full flex flex-col justify-between">
                          <Tag color={getStatusTagColor(status)} className="m-0 w-fit mb-4">{STATUS_MAP[status] ?? status}</Tag>
                          <div>
                            <div className="text-3xl font-semibold text-gray-900 mb-1">{count} <span className="text-sm font-normal text-gray-400">篇</span></div>
                            <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">点击检索该状态列表 →</div>
                          </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
          </div>
          
          <div className="flex flex-col">
             <div className="flex items-center justify-between mb-4 border-b border-[#e5e7eb] pb-2">
                <Title level={4} className="!m-0 !font-medium text-gray-900">核心模块跳转</Title>
             </div>
             <div className="space-y-3">
               {quickEntries.map((item) => (
                  <Link key={item.key} href={item.key} className="block group">
                    <div className="bg-white border border-[#e5e7eb] p-5 rounded-sm shadow-sm transition-colors group-hover:bg-gray-50 flex flex-col gap-2">
                      <div className="flex justify-between items-center w-full">
                         <span className="font-semibold text-gray-900 group-hover:text-[#8B1538] transition-colors">{item.title}</span>
                         <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-sm border border-gray-200">{item.value} {item.suffix}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">{item.desc}</div>
                    </div>
                  </Link>
                ))}
             </div>
          </div>
      </section>

      {/* Tables Section */}
      <section className="space-y-12">
        <div>
           <div className="flex items-center justify-between mb-4 border-b border-[#e5e7eb] pb-3">
              <Title level={4} className="!m-0 !font-medium text-gray-900 border-l-4 border-orange-500 pl-3">待处理积压大盘</Title>
              <Link href="/admin/manuscripts" className="text-sm text-blue-600 hover:text-blue-800">查阅所有排队记录</Link>
           </div>
          {pendingList.length === 0 ? (
            <div className="border border-dashed border-gray-200 py-12 rounded-sm bg-gray-50/50">
              <Empty description="可喜可贺，当前暂无任何待处积压" />
            </div>
          ) : (
            <div className="border border-[#e5e7eb] rounded-sm overflow-hidden shadow-sm bg-white">
               <Table<AdminManuscriptItem>
                  rowKey="id"
                  columns={pendingColumns}
                  dataSource={pendingList}
                  pagination={false}
                  size="middle"
                  scroll={{ x: "max-content" }}
                  rowClassName="hover:bg-gray-50 transition-colors"
               />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
           <div>
             <div className="flex items-center justify-between mb-4 border-b border-[#e5e7eb] pb-3">
                <Title level={4} className="!m-0 !font-medium text-gray-900">近期新注册账单</Title>
                <Link href="/admin/users" className="text-sm text-blue-600 hover:text-blue-800">管理全部用户</Link>
             </div>
             {recentUsers.length === 0 ? (
              <div className="border border-dashed border-gray-200 py-12 rounded-sm bg-gray-50/50">
                <Empty description="暂无新注册活跃反馈" />
              </div>
            ) : (
              <div className="border border-[#e5e7eb] rounded-sm overflow-hidden shadow-sm bg-white">
                 <Table<AdminUserItem>
                    rowKey="id"
                    columns={recentUsersColumns}
                    dataSource={recentUsers}
                    pagination={false}
                    size="small"
                    scroll={{ x: "max-content" }}
                    rowClassName="hover:bg-gray-50 transition-colors"
                 />
              </div>
            )}
           </div>

           <div>
             <div className="flex items-center justify-between mb-4 border-b border-[#e5e7eb] pb-3">
                <Title level={4} className="!m-0 !font-medium text-gray-900 border-l-4 border-indigo-500 pl-3">全系统活跃快取</Title>
                <Link href="/admin/manuscripts" className="text-sm text-blue-600 hover:text-blue-800">查看完整审批录</Link>
             </div>
             {recentActions.length === 0 ? (
                <div className="border border-dashed border-gray-200 py-12 rounded-sm bg-gray-50/50">
                  <Empty description="安静得出奇：暂无后台操作动作" />
                </div>
              ) : (
                <div className="border border-[#e5e7eb] rounded-sm overflow-hidden shadow-sm bg-white">
                   <Table<AdminRecentActionItem>
                      rowKey="id"
                      columns={recentActionsColumns}
                      dataSource={recentActions}
                      pagination={false}
                      size="small"
                      scroll={{ x: "max-content" }}
                      rowClassName="hover:bg-gray-50 transition-colors"
                   />
                </div>
              )}
           </div>
        </div>
      </section>
    </div>
  );
}
