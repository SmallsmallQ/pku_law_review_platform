"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Select, Space, Spin, Table, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import { STATUS_MAP } from "@/lib/constants";
import { authApi, manuscriptsApi, type ManuscriptListItem } from "@/services/api";

const pageSize = 20;

export default function AuthorCenterPage() {
  const { user, loading: authLoading, setUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const keywordFilter = (searchParams.get("q") ?? "").trim();
  const [profileForm] = Form.useForm<{ real_name?: string; institution?: string }>();
  const [list, setList] = useState<ManuscriptListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [page, setPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    if (searchParams.get("submitted") === "1") {
      setSuccessMessage("投稿已提交成功");
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) {
      router.push("/login?returnUrl=/author");
      return;
    }
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await manuscriptsApi.my({
          page,
          page_size: pageSize,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(keywordFilter ? { keyword: keywordFilter } : {}),
        });
        setList(res.items);
        setTotal(res.total);
      } catch (e) {
        setList([]);
        setLoadError(e instanceof Error ? e.message : "加载失败，请刷新重试");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, page, statusFilter, keywordFilter, router]);

  useEffect(() => {
    if (!user) return;
    profileForm.setFieldsValue({
      real_name: user.real_name ?? "",
      institution: user.institution ?? "",
    });
  }, [user, profileForm]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center bg-[#f5f6f8]">
        <Spin size="large" />
      </div>
    );
  }

  const columns: ColumnsType<ManuscriptListItem> = [
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
      width: 180,
      render: (_, r) => (
        <Space size="small">
          <Link href={`/author/${r.id}`}>详情</Link>
          {r.status === "revision_requested" && (
            <Link href={`/author/${r.id}/revise`}>上传修订稿</Link>
          )}
        </Space>
      ),
    },
  ];

  const handleSaveProfile = async (values: { real_name?: string; institution?: string }) => {
    setSavingProfile(true);
    try {
      const realName = values.real_name?.trim() ?? "";
      const institution = values.institution?.trim() ?? "";
      const updated = await authApi.updateMe({
        real_name: realName || null,
        institution: institution || null,
      });
      setUser(updated);
      message.success("个人资料已更新");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "更新失败");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="bg-[#f5f6f8]">
      <HeaderBar />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8" aria-label="我的稿件">
        <Card title="个人资料" className="mb-6">
          <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile}>
            <Form.Item label="登录邮箱">
              <Input value={user.email} disabled />
            </Form.Item>
            <Form.Item
              name="real_name"
              label="姓名"
              rules={[{ required: true, message: "请输入姓名" }]}
            >
              <Input placeholder="请输入姓名" maxLength={100} />
            </Form.Item>
            <Form.Item
              name="institution"
              label="单位"
              rules={[{ required: true, message: "请输入单位" }]}
            >
              <Input placeholder="请输入单位" maxLength={200} />
            </Form.Item>
            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" loading={savingProfile}>
                保存个人资料
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card
          title="我的稿件"
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
          {keywordFilter && (
            <Alert
              className="mb-4"
              type="info"
              showIcon
              message={`当前搜索：${keywordFilter}`}
            />
          )}
          {successMessage && (
            <Alert message={successMessage} type="success" showIcon className="mb-4" />
          )}
          {loadError && (
            <Alert message={loadError} type="warning" showIcon className="mb-4" action={<Button size="small" onClick={() => window.location.reload()}>刷新</Button>} />
          )}
          <Table<ManuscriptListItem>
            rowKey="id"
            columns={columns}
            dataSource={list}
            loading={loading}
            scroll={{ x: "max-content" }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: false,
              showTotal: (t) => `共 ${t} 条`,
              onChange: setPage,
            }}
            locale={{
              emptyText: (
                <span>
                  暂无稿件，
                  <Link href="/submit" className="text-[#8B1538] ml-1">
                    去投稿
                  </Link>
                </span>
              ),
            }}
          />
        </Card>
      </main>
    </div>
  );
}
