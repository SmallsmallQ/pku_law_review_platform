"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import HeaderBar from "@/components/HeaderBar";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_MAP } from "@/lib/constants";
import { authApi, manuscriptsApi, type ManuscriptListItem, type User } from "@/services/api";

const { Paragraph, Text, Title } = Typography;

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

function getStatusColor(status: string) {
  if (status === "revision_requested") return "orange";
  if (status === "accepted") return "green";
  if (status === "rejected") return "red";
  if (status === "submitted" || status === "under_review") return "processing";
  return "default";
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
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
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
      } catch (error) {
        setList([]);
        setLoadError(error instanceof Error ? error.message : "加载失败，请刷新重试");
      } finally {
        setLoading(false);
      }
    })();
  }, [keywordFilter, page, router, statusFilter, user]);

  useEffect(() => {
    if (!user) return;
    setFormFromUser(profileForm, user);
  }, [profileForm, user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center bg-[#f4f6f8]">
        <Spin size="large" />
      </div>
    );
  }

  const currentPageReviewing = list.filter((item) =>
    !["accepted", "rejected"].includes(item.status),
  ).length;
  const currentPageRevision = list.filter((item) => item.status === "revision_requested").length;

  const columns: ColumnsType<ManuscriptListItem> = [
    {
      title: "稿件编号",
      dataIndex: "manuscript_no",
      key: "manuscript_no",
      width: 140,
    },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (title: string) => <span className="block max-w-[420px] truncate">{title}</span>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{STATUS_MAP[status] ?? status}</Tag>
      ),
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
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Link href={`/author/${record.id}`}>详情</Link>
          {record.status === "revision_requested" ? (
            <Link href={`/author/${record.id}/revise`}>上传修订稿</Link>
          ) : null}
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
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="bg-[#f4f6f8]">
      <HeaderBar />
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        aria-label="作者中心"
      >
        <Space direction="vertical" size={24} className="flex w-full">
          <Card styles={{ body: { padding: 28 } }}>
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} lg={16}>
                <Text className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1538]">
                  Author Center
                </Text>
                <Title level={2} className="!mb-2 !mt-3 !text-[#1f2937]">
                  作者中心
                </Title>
                <Paragraph className="!mb-0 !max-w-3xl !text-[15px] !leading-8 !text-[#667085]">
                  在这里统一维护作者资料、查看稿件状态、接收退修意见并继续上传修订稿。页面已经开始迁到新的 Ant Design 基座上，后续其他工作台也会沿这套结构推进。
                </Paragraph>
              </Col>
              <Col xs={24} lg={8}>
                <Space wrap>
                  <Link href="/submit">
                    <Button type="primary" size="large">
                      发起新投稿
                    </Button>
                  </Link>
                  <Link href="/guide">
                    <Button size="large">查看投稿须知</Button>
                  </Link>
                </Space>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card size="small">
                <Statistic title="稿件总数" value={total} />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small">
                <Statistic title="当前页处理中" value={currentPageReviewing} />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small">
                <Statistic title="当前页待退修" value={currentPageRevision} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} align="stretch">
            <Col xs={24} xl={8}>
              <Card title="账户概览">
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="登录邮箱">{user.email}</Descriptions.Item>
                  <Descriptions.Item label="姓名">{user.real_name || "未填写"}</Descriptions.Item>
                  <Descriptions.Item label="单位">{user.institution || "未填写"}</Descriptions.Item>
                  <Descriptions.Item label="身份">{user.role}</Descriptions.Item>
                </Descriptions>
                <Space direction="vertical" size={12} className="mt-6 flex w-full">
                  <Link href="/submit">
                    <Button block type="primary">
                      进入投稿入口
                    </Button>
                  </Link>
                  <Link href="/copyright">
                    <Button block>查看版权协议</Button>
                  </Link>
                </Space>
              </Card>
            </Col>

            <Col xs={24} xl={16}>
              <Card
                title="个人信息"
                extra={<Text type="secondary">带 * 字段为必填项</Text>}
              >
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={handleSaveProfile}
                >
                  <Row gutter={16}>
                    <Col xs={24}>
                      <Form.Item label="登录邮箱">
                        <Input value={user.email} disabled />
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Title level={5} className="!mb-4 !mt-0">
                        基本信息
                      </Title>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="real_name"
                        label="姓名"
                        rules={[{ required: true, message: "请输入姓名" }]}
                      >
                        <Input placeholder="请输入姓名" maxLength={100} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="salutation" label="称呼">
                        <Select placeholder="请选择" allowClear options={SALUTATION_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="name_en_first" label="英文名 First Name">
                        <Input placeholder="First Name" maxLength={50} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="name_en_middle" label="Middle Name">
                        <Input placeholder="Middle Name" maxLength={50} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="name_en_last" label="Last Name">
                        <Input placeholder="Last Name" maxLength={50} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="ethnicity" label="民族">
                        <Select placeholder="请选择" allowClear options={ETHNICITY_OPTIONS} />
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Title level={5} className="!mb-4 !mt-2">
                        通信信息
                      </Title>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="phone" label="电话">
                        <Input placeholder="请输入电话" maxLength={30} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="postal_code"
                        label="邮政编码"
                        rules={[{ required: true, message: "请输入邮政编码" }]}
                      >
                        <Input placeholder="请输入邮政编码" maxLength={20} />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item
                        name="postal_address"
                        label="邮寄地址"
                        rules={[{ required: true, message: "请输入邮寄地址" }]}
                      >
                        <Input placeholder="请输入邮寄地址" maxLength={300} />
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Title level={5} className="!mb-4 !mt-2">
                        研究与单位
                      </Title>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="research_field" label="研究领域">
                        <Input placeholder="请填写您的研究领域" maxLength={200} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="title_zh"
                        label="职务"
                        rules={[{ required: true, message: "请选择职务" }]}
                      >
                        <Select placeholder="请选择职务" options={TITLE_ZH_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="title_en"
                        label="职称"
                        rules={[{ required: true, message: "请选择职称" }]}
                      >
                        <Select placeholder="请选择职称" options={TITLE_EN_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item
                        name="institution"
                        label="单位名称"
                        rules={[{ required: true, message: "请输入单位名称" }]}
                      >
                        <Input placeholder="请输入单位名称" maxLength={200} />
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Space>
                        <Button type="primary" htmlType="submit" loading={savingProfile}>
                          保存修改
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </Form>
              </Card>
            </Col>
          </Row>

          <Card
            title="我的稿件"
            extra={
              <Space align="center" wrap>
                <Text type="secondary">状态筛选</Text>
                <Select
                  value={statusFilter || undefined}
                  onChange={(value) => {
                    setStatusFilter(value || "");
                    setPage(1);
                  }}
                  placeholder="全部"
                  style={{ width: 140 }}
                  allowClear
                  options={Object.entries(STATUS_MAP).map(([key, value]) => ({
                    label: value,
                    value: key,
                  }))}
                />
              </Space>
            }
          >
            <Space direction="vertical" size={16} className="flex w-full">
              {keywordFilter ? (
                <Alert type="info" showIcon message={`当前搜索：${keywordFilter}`} />
              ) : null}
              {successMessage ? <Alert message={successMessage} type="success" showIcon /> : null}
              {loadError ? (
                <Alert
                  message={loadError}
                  type="warning"
                  showIcon
                  action={
                    <Button size="small" onClick={() => window.location.reload()}>
                      刷新
                    </Button>
                  }
                />
              ) : null}

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
                  showTotal: (value) => `共 ${value} 条`,
                  onChange: setPage,
                }}
                locale={{
                  emptyText: (
                    <span>
                      暂无稿件，
                      <Link href="/submit" className="ml-1 text-[#8B1538]">
                        去投稿
                      </Link>
                    </span>
                  ),
                }}
              />
            </Space>
          </Card>
        </Space>
      </main>
    </div>
  );
}
