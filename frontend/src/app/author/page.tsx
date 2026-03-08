"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Select, Space, Spin, Table, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import { STATUS_MAP } from "@/lib/constants";
import { authApi, manuscriptsApi, type ManuscriptListItem, type User } from "@/services/api";

const pageSize = 20;

type ProfileFormValues = {
  real_name?: string;
  institution?: string;
  name_en_first?: string;
  name_en_middle?: string;
  name_en_last?: string;
  salutation?: string;
  ethnicity?: string;
  phone?: string;
  postal_address?: string;
  postal_code?: string;
  research_field?: string;
  title_zh?: string;
  title_en?: string;
};

const SALUTATION_OPTIONS = [
  { value: "", label: "请选择" },
  { value: "先生", label: "先生" },
  { value: "女士", label: "女士" },
  { value: "教授", label: "教授" },
  { value: "其他", label: "其他" },
];

const ETHNICITY_OPTIONS = [
  { value: "", label: "请选择" },
  { value: "汉族", label: "汉族" },
  { value: "少数民族", label: "少数民族" },
  { value: "其他", label: "其他" },
];

const TITLE_ZH_OPTIONS = [
  { value: "教授", label: "教授" },
  { value: "副教授", label: "副教授" },
  { value: "讲师", label: "讲师" },
  { value: "研究员", label: "研究员" },
  { value: "其他", label: "其他" },
];

const TITLE_EN_OPTIONS = [
  { value: "教授", label: "教授" },
  { value: "副教授", label: "副教授" },
  { value: "讲师", label: "讲师" },
  { value: "研究员", label: "研究员" },
  { value: "其他", label: "其他" },
];

function setFormFromUser(form: ReturnType<typeof Form.useForm<ProfileFormValues>>[0], u: User | null) {
  if (!u) return;
  form.setFieldsValue({
    real_name: u.real_name ?? "",
    institution: u.institution ?? "",
    name_en_first: u.name_en_first ?? "",
    name_en_middle: u.name_en_middle ?? "",
    name_en_last: u.name_en_last ?? "",
    salutation: u.salutation ?? "",
    ethnicity: u.ethnicity ?? "",
    phone: u.phone ?? "",
    postal_address: u.postal_address ?? "",
    postal_code: u.postal_code ?? "",
    research_field: u.research_field ?? "",
    title_zh: u.title_zh ?? "其他",
    title_en: u.title_en ?? "其他",
  });
}

export default function AuthorCenterPage() {
  const { user, loading: authLoading, setUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const keywordFilter = (searchParams.get("q") ?? "").trim();
  const [profileForm] = Form.useForm<ProfileFormValues>();
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
    setFormFromUser(profileForm, user);
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

  const handleSaveProfile = async (values: ProfileFormValues) => {
    setSavingProfile(true);
    try {
      const updated = await authApi.updateMe({
        real_name: values.real_name?.trim() || null,
        institution: values.institution?.trim() || null,
        name_en_first: values.name_en_first?.trim() || null,
        name_en_middle: values.name_en_middle?.trim() || null,
        name_en_last: values.name_en_last?.trim() || null,
        salutation: values.salutation?.trim() || null,
        ethnicity: values.ethnicity?.trim() || null,
        phone: values.phone?.trim() || null,
        postal_address: values.postal_address?.trim() || null,
        postal_code: values.postal_code?.trim() || null,
        research_field: values.research_field?.trim() || null,
        title_zh: values.title_zh?.trim() || null,
        title_en: values.title_en?.trim() || null,
      });
      setUser(updated);
      message.success("个人信息已保存");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingProfile(false);
    }
  };

  const sectionClass = "rounded-xl border border-[#e8e8e8] bg-white/80 p-5 md:p-6";
  const sectionTitleClass = "mb-4 flex items-center gap-2 text-[15px] font-semibold text-[#2e3340] before:h-4 before:w-1 before:rounded-full before:bg-[#8B1538] before:content-['']";

  return (
    <div className="bg-[#f5f6f8]">
      <HeaderBar />
      <main id="main-content" className="mx-auto w-full max-w-4xl px-4 py-8 sm:max-w-5xl sm:px-6 md:px-8 lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px]" aria-label="作者中心">
        <Card
          className="mb-8 overflow-hidden border-[#e8e8e8] shadow-sm"
          styles={{
            header: { borderBottom: "1px solid #f0f0f0", padding: "16px 24px", background: "#fafafa" },
            body: { padding: "24px" },
          }}
          title={
            <span className="text-lg font-semibold text-[#2e3340]">个人信息</span>
          }
          extra={
            <span className="text-xs text-[#8c8c8c]">* 为必填项</span>
          }
        >
          <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile} className="author-profile-form">
            <Form.Item label="登录邮箱" className="!mb-6">
              <Input value={user.email} disabled className="max-w-md !rounded-md" />
            </Form.Item>

            <div className={sectionClass}>
              <div className={sectionTitleClass}>基本信息</div>
              <div className="grid gap-x-6 gap-y-0 md:grid-cols-2">
                <Form.Item
                  name="real_name"
                  label="姓名"
                  rules={[{ required: true, message: "请输入姓名" }]}
                  className="md:col-span-2"
                >
                  <Input placeholder="请输入姓名" maxLength={100} className="!rounded-md" />
                </Form.Item>
                <Form.Item name="name_en_first" label="英文名 First Name">
                  <Input placeholder="First Name" maxLength={50} className="!rounded-md" />
                </Form.Item>
                <Form.Item name="name_en_middle" label="Middle Name">
                  <Input placeholder="Middle Name" maxLength={50} className="!rounded-md" />
                </Form.Item>
                <Form.Item name="name_en_last" label="Last Name">
                  <Input placeholder="Last Name" maxLength={50} className="!rounded-md" />
                </Form.Item>
                <Form.Item name="salutation" label="称呼">
                  <Select placeholder="请选择" allowClear options={SALUTATION_OPTIONS} className="!rounded-md" />
                </Form.Item>
                <Form.Item name="ethnicity" label="民族">
                  <Select placeholder="请选择" allowClear options={ETHNICITY_OPTIONS} className="!rounded-md" />
                </Form.Item>
              </div>
            </div>

            <div className={`${sectionClass} mt-5`}>
              <div className={sectionTitleClass}>通信信息</div>
              <div className="grid gap-x-6 gap-y-0 md:grid-cols-2">
                <Form.Item name="phone" label="电话">
                  <Input placeholder="请输入电话" maxLength={30} className="!rounded-md" />
                </Form.Item>
                <Form.Item name="postal_code" label="邮政编码" rules={[{ required: true, message: "请输入邮政编码" }]} className="md:col-span-1">
                  <Input placeholder="请输入邮政编码" maxLength={20} className="!rounded-md" />
                </Form.Item>
                <Form.Item
                  name="postal_address"
                  label="邮寄地址"
                  rules={[{ required: true, message: "请输入邮寄地址" }]}
                  className="md:col-span-2"
                >
                  <Input placeholder="请输入邮寄地址" maxLength={300} className="!rounded-md" />
                </Form.Item>
              </div>
            </div>

            <div className={`${sectionClass} mt-5`}>
              <div className={sectionTitleClass}>研究领域</div>
              <Form.Item name="research_field" label="研究领域" className="!mb-0">
                <Input placeholder="请填写您的研究领域" maxLength={200} className="!rounded-md" />
              </Form.Item>
            </div>

            <div className={`${sectionClass} mt-5`}>
              <div className={sectionTitleClass}>工作单位</div>
              <div className="grid gap-x-6 gap-y-0 md:grid-cols-2">
                <Form.Item name="title_zh" label="职务" rules={[{ required: true, message: "请选择职务" }]}>
                  <Select placeholder="请选择职务" options={TITLE_ZH_OPTIONS} className="!rounded-md" />
                </Form.Item>
                <Form.Item name="title_en" label="职称" rules={[{ required: true, message: "请选择职称" }]}>
                  <Select placeholder="请选择职称" options={TITLE_EN_OPTIONS} className="!rounded-md" />
                </Form.Item>
                <Form.Item
                  name="institution"
                  label="单位名称"
                  rules={[{ required: true, message: "请输入单位名称" }]}
                  className="md:col-span-2"
                >
                  <Input placeholder="请输入单位名称" maxLength={200} className="!rounded-md" />
                </Form.Item>
              </div>
            </div>

            <div className="mt-6 flex items-center border-t border-[#f0f0f0] pt-6">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={savingProfile}
                className="!rounded-md !bg-[#8B1538] px-8 hover:!bg-[#70122e]"
              >
                保存修改
              </Button>
            </div>
          </Form>
        </Card>
        <Card
          className="overflow-hidden border-[#e8e8e8] shadow-sm"
          styles={{
            header: { borderBottom: "1px solid #f0f0f0", padding: "16px 24px", background: "#fafafa" },
            body: { padding: "24px" },
          }}
          title={<span className="text-lg font-semibold text-[#2e3340]">我的稿件</span>}
          extra={
            <Space align="center">
              <Typography.Text type="secondary" className="text-sm">状态筛选</Typography.Text>
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
