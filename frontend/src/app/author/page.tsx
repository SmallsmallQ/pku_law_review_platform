"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
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
  Divider,
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
    <div className="bg-white text-[#1d1d1f] min-h-screen flex flex-col">
      <HeaderBar />
      <main
        id="main-content"
        className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
        aria-label="作者中心"
      >
        <section className="mb-10">
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} lg={16}>
              <Text className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1538]">
                Author Center
              </Text>
              <Title level={1} className="!mb-3 !mt-3 !font-medium !text-[#1f2937]">
                作者中心
              </Title>
              <Paragraph className="!mb-0 !max-w-3xl !text-[16px] !leading-relaxed !text-[#6b7280]">
                在这里统一维护作者资料、查看稿件状态、接收退修意见并继续上传修订稿。页面已经开始迁到新的 Ant Design 基座上，后续其他工作台也会沿这套结构推进。
              </Paragraph>
            </Col>
            <Col xs={24} lg={8} className="text-left lg:text-right">
              <Space wrap>
                <Link href="/submit">
                  <Button type="primary" size="large" className="bg-[#8B1538] hover:!bg-[#A51D45] border-none rounded-sm px-6">
                    发起新投稿
                  </Button>
                </Link>
                <Link href="/guide">
                  <Button size="large" className="rounded-sm">
                    查看投稿须知
                  </Button>
                </Link>
              </Space>
            </Col>
          </Row>
        </section>

        <Divider className="!border-[#e5e7eb] !mb-10" />

        <section className="mb-12">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <div className="bg-gray-50 border border-[#e5e7eb] p-6 rounded-sm flex items-center justify-between">
                 <Text className="text-gray-500 font-medium">我的稿件总数</Text>
                 <Text className="text-3xl font-serif-sc text-gray-900">{total}</Text>
              </div>
            </Col>
            <Col xs={24} md={8}>
               <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-sm flex items-center justify-between">
                 <Text className="text-blue-700 font-medium">当前处理中</Text>
                 <Text className="text-3xl font-serif-sc text-blue-800">{currentPageReviewing}</Text>
              </div>
            </Col>
            <Col xs={24} md={8}>
               <div className="bg-red-50/50 border border-red-100 p-6 rounded-sm flex items-center justify-between">
                 <Text className="text-[#8B1538] font-medium">待退修回传</Text>
                 <Text className="text-3xl font-serif-sc text-[#8B1538]">{currentPageRevision}</Text>
              </div>
            </Col>
          </Row>
        </section>

        <Divider className="!border-[#e5e7eb] !mb-10" />

        <Row gutter={[48, 48]} align="top">
          {/* 左侧主要区域 */}
          <Col xs={24} xl={16}>
             <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <Title level={3} className="!mb-0 !font-normal !text-gray-900">
                    个人信息资料
                  </Title>
                  <Text type="secondary" className="text-sm">带 * 字段为必填项</Text>
                </div>
                
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={handleSaveProfile}
                  className="bg-white border border-[#e5e7eb] p-8 rounded-sm shadow-sm"
                >
                  <Row gutter={24}>
                    <Col xs={24}>
                      <Form.Item label="登录邮箱">
                        <Input size="large" value={user.email} disabled className="bg-gray-50" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Divider className="!my-6 border-[#f0f0f0]" />

                  <Row gutter={24}>
                    <Col xs={24}>
                      <Title level={5} className="!mb-6 !mt-0 !text-gray-800">
                        第一部分：基本信息
                      </Title>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="real_name"
                        label="姓名"
                        rules={[{ required: true, message: "请输入姓名" }]}
                      >
                        <Input size="large" placeholder="请输入真实姓名" maxLength={100} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="salutation" label="称呼">
                        <Select size="large" placeholder="请选择" allowClear options={SALUTATION_OPTIONS} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="name_en_last" label="姓 - Last Name (如: Zhang)">
                        <Input size="large" placeholder="Last Name" maxLength={50} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="name_en_first" label="名 - First Name (如: San)">
                        <Input size="large" placeholder="First Name" maxLength={50} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="name_en_middle" label="Middle Name">
                        <Input size="large" placeholder="Middle Name" maxLength={50} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="ethnicity" label="民族">
                        <Select size="large" placeholder="请选择" allowClear options={ETHNICITY_OPTIONS} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Divider className="!my-6 border-[#f0f0f0]" />

                  <Row gutter={24}>
                    <Col xs={24}>
                      <Title level={5} className="!mb-6 !mt-0 !text-gray-800">
                        第二部分：通信信息
                      </Title>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="phone" label="联系电话">
                        <Input size="large" placeholder="请输入手机或固话" maxLength={30} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="postal_code"
                        label="邮政编码"
                        rules={[{ required: true, message: "请输入邮政编码" }]}
                      >
                        <Input size="large" placeholder="请输入邮编" maxLength={20} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item
                        name="postal_address"
                        label="详细邮寄地址"
                        rules={[{ required: true, message: "请输入邮寄地址" }]}
                      >
                        <Input size="large" placeholder="请输入详细地址，用于接收样刊等" maxLength={300} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider className="!my-6 border-[#f0f0f0]" />

                  <Row gutter={24}>
                    <Col xs={24}>
                      <Title level={5} className="!mb-6 !mt-0 !text-gray-800">
                        第三部分：研究与学术单位
                      </Title>
                    </Col>
                     <Col xs={24}>
                      <Form.Item
                        name="institution"
                        label="单位名称"
                        rules={[{ required: true, message: "请输入单位名称" }]}
                      >
                        <Input size="large" placeholder="请输入完整的工作单位名称" maxLength={200} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="research_field" label="重点研究领域">
                        <Input.TextArea rows={3} placeholder="请简要填写您的研究专长与主要领域" maxLength={200} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="title_zh"
                        label="行政职务"
                        rules={[{ required: true, message: "请选择职务" }]}
                      >
                        <Select size="large" placeholder="请选择职务" options={TITLE_ZH_OPTIONS} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="title_en"
                        label="学术职称"
                        rules={[{ required: true, message: "请选择职称" }]}
                      >
                        <Select size="large" placeholder="请选择职称" options={TITLE_EN_OPTIONS} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <div className="mt-6 flex justify-end border-t border-[#f0f0f0] pt-6">
                    <Button type="primary" size="large" htmlType="submit" loading={savingProfile} className="bg-[#8B1538] hover:!bg-[#A51D45] border-none px-12 rounded-sm shadow-sm">
                      保存所有修改
                    </Button>
                  </div>
                </Form>
             </section>
          </Col>

          {/* 右侧边栏区 */}
          <Col xs={24} xl={8}>
            <section className="xl:sticky xl:top-6">
              <div className="bg-gray-50 border border-[#e5e7eb] p-6 rounded-sm mb-8">
                 <Title level={5} className="!font-medium !text-gray-900 !mt-0 !mb-5 flex items-center justify-between">
                    账户总览摘要
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">作者级账户</span>
                 </Title>
                 <Descriptions column={1} size="small" className="mb-0 text-sm">
                  <Descriptions.Item label={<span className="text-gray-500">主邮箱</span>}>{user.email}</Descriptions.Item>
                  <Descriptions.Item label={<span className="text-gray-500">识别姓名</span>}>{user.real_name || "待完善"}</Descriptions.Item>
                  <Descriptions.Item label={<span className="text-gray-500">隶属机构</span>}>{user.institution || "待完善"}</Descriptions.Item>
                  <Descriptions.Item label={<span className="text-gray-500">系统角色</span>}>{user.role}</Descriptions.Item>
                </Descriptions>
                
                <Space direction="vertical" size={12} className="mt-8 flex w-full">
                  <Link href="/submit">
                    <Button block size="large" className="rounded-sm text-[#8B1538] border-[#8B1538] hover:!text-[#A51D45] hover:!border-[#A51D45]">
                      进入投稿入口
                    </Button>
                  </Link>
                  <Link href="/copyright">
                    <Button block size="large" type="text" className="rounded-sm text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 border-none mt-2">
                       查阅版权协议副本
                    </Button>
                  </Link>
                </Space>
              </div>
            </section>
          </Col>
        </Row>
        
        <Divider className="!border-[#e5e7eb] !my-4" />

        <section id="my-manuscripts-list" className="mt-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <Title level={3} className="!mb-0 !font-normal !text-gray-900">
                我投递的稿件
              </Title>
              <Space align="center" wrap>
                <Text type="secondary" className="text-sm">状态筛选</Text>
                <Select
                  value={statusFilter || undefined}
                  onChange={(value) => {
                    setStatusFilter(value || "");
                    setPage(1);
                  }}
                  placeholder="全部状态筛选"
                  style={{ width: 160 }}
                  allowClear
                  options={Object.entries(STATUS_MAP).map(([key, value]) => ({
                    label: value,
                    value: key,
                  }))}
                />
              </Space>
            </div>
            
            <Space direction="vertical" size={16} className="flex w-full">
              {keywordFilter ? (
                <Alert type="info" showIcon message={`当前搜索：${keywordFilter}`} className="rounded-sm border-blue-200 bg-blue-50" />
              ) : null}
              {successMessage ? <Alert message={successMessage} type="success" showIcon className="rounded-sm" /> : null}
              {loadError ? (
                <Alert
                  message={loadError}
                  type="warning"
                  showIcon
                  className="rounded-sm"
                  action={
                    <Button size="small" onClick={() => window.location.reload()}>
                      刷新重试
                    </Button>
                  }
                />
              ) : null}

              <div className="border border-[#e5e7eb] rounded-sm overflow-hidden bg-white shadow-sm">
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
                    showTotal: (value) => `共找到 ${value} 条记录`,
                    onChange: setPage,
                  }}
                  locale={{
                    emptyText: (
                      <div className="py-12">
                        <span className="text-gray-400">暂无稿件记录，</span>
                        <Link href="/submit" className="text-[#8B1538] hover:underline font-medium">
                          立刻去投稿
                        </Link>
                      </div>
                    ),
                  }}
                />
              </div>
            </Space>
        </section>
      </main>
    </div>
  );
}
