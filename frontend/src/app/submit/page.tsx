"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  List,
  Row,
  Select,
  Spin,
  Space,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import HeaderBar from "@/components/HeaderBar";
import { useAuth } from "@/contexts/AuthContext";
import {
  COPYRIGHT_AGREEMENT_CHECKBOX_LABEL,
  COPYRIGHT_AGREEMENT_PARAGRAPHS,
  COPYRIGHT_AGREEMENT_TITLE,
} from "@/lib/copyrightAgreement";
import { manuscriptsApi } from "@/services/api";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type AuthorRow = {
  id: number;
  name: string;
  institution: string;
  department: string;
  address: string;
  phone: string;
  email: string;
  isCorresponding: boolean;
};

type FundRow = {
  id: number;
  projectNo: string;
  projectName: string;
  unit: string;
  category: string;
  enName: string;
  fundName: string;
  remark: string;
};

const PLAN_OPTIONS = [
  { label: "法理学研究", value: "jurisprudence" },
  { label: "宪法行政学研究", value: "jurisprudence" },
  { label: "民商法研究", value: "civil-commercial" },
  { label: "刑法研究", value: "criminal" },
  { label: "诉讼法研究", value: "procedure" },
  { label: "国际法研究", value: "international" },
  { label: "新技术法学", value: "new-technology" },
];

function formatBytes(size?: number) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SubmitPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [error, setError] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewType, setPreviewType] = useState<"pdf" | "docx" | "doc" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [docxPreviewText, setDocxPreviewText] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [authorRows, setAuthorRows] = useState<AuthorRow[]>([]);
  const [fundRows, setFundRows] = useState<FundRow[]>([]);
  const [noFund, setNoFund] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?returnUrl=/submit");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setAuthorRows([
      {
        id: Date.now(),
        name: user.real_name || "",
        institution: user.institution || "",
        department: "",
        address: "",
        phone: "",
        email: user.email || "",
        isCorresponding: true,
      },
    ]);
    setFundRows([]);
    setNoFund(false);
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center bg-[#f5f6f8]">
        <Spin size="large" />
      </div>
    );
  }

  const submit = async (values: Record<string, string | boolean>) => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      setError("请上传稿件文件（Word 或 PDF）");
      return;
    }
    const correspondingAuthor = authorRows.find((a) => a.isCorresponding);
    if (authorRows.length === 0) {
      setError("请至少填写一位作者");
      return;
    }
    if (!correspondingAuthor) {
      setError("请至少选择一位通讯作者");
      return;
    }
    if (authorRows.some((a) => !a.name.trim())) {
      setError("作者姓名不能为空");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", String(values.title ?? ""));
      fd.append("abstract", String(values.abstract ?? ""));
      fd.append("keywords", String(values.keywords ?? ""));
      fd.append(
        "author_info",
        JSON.stringify({
          authors: authorRows,
          corresponding_author_index: authorRows.findIndex((a) => a.isCorresponding),
        }),
      );
      fd.append("institution", correspondingAuthor.institution || String(values.institution ?? ""));
      fd.append("fund", noFund ? "无基金" : JSON.stringify({ funds: fundRows }));
      fd.append("contact", correspondingAuthor.phone || correspondingAuthor.email || String(values.contact ?? ""));
      fd.append("submit", "true");
      fd.append("file", file);
      const res = await manuscriptsApi.create(fd);
      const manuscriptId = Number(res.manuscript?.id);
      const parseJobId = Number(res.parse_job?.id);
      const query = new URLSearchParams({ submitted: "1" });
      if (Number.isFinite(parseJobId) && parseJobId > 0) {
        query.set("parseJobId", String(parseJobId));
      }
      router.push(Number.isFinite(manuscriptId) && manuscriptId > 0 ? `/author/${manuscriptId}?${query.toString()}` : `/author?submitted=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿失败");
    } finally {
      setLoading(false);
    }
  };

  const normFile = (e: { fileList: UploadFile[] }) => {
    const list = e?.fileList ?? [];
    const valid = list.filter((f) => {
      const name = (f.name || "").toLowerCase();
      const isAllowed = name.endsWith(".docx") || name.endsWith(".doc") || name.endsWith(".pdf");
      const size = f.size ?? 0;
      return isAllowed && size <= MAX_FILE_SIZE_BYTES;
    });

    const file = valid[0]?.originFileObj as File | undefined;
    setPreviewError("");
    setDocxPreviewText("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    if (file) {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith(".pdf")) {
        setPreviewType("pdf");
        setPreviewUrl(URL.createObjectURL(file));
      } else if (lowerName.endsWith(".docx")) {
        setPreviewType("docx");
        file
          .arrayBuffer()
          .then(async (arrayBuffer) => {
            const mammoth = await import("mammoth");
            return mammoth.extractRawText({ arrayBuffer });
          })
          .then((result) => {
            setDocxPreviewText((result.value || "").trim().slice(0, 12000));
          })
          .catch(() => {
            setPreviewError("DOCX 预览解析失败，但不影响正常提交。");
          });
      } else if (lowerName.endsWith(".doc")) {
        setPreviewType("doc");
      } else {
        setPreviewType(null);
      }
    } else {
      setPreviewType(null);
      const picked = list[0];
      if (picked) {
        const tooLarge = (picked.size ?? 0) > MAX_FILE_SIZE_BYTES;
        setPreviewError(
          tooLarge
            ? `文件大小不能超过 ${MAX_FILE_SIZE_MB}MB。`
            : "仅支持 .doc / .docx / .pdf 格式。",
        );
      }
    }

    setFileList(valid);
    return valid;
  };

  const selectedFile = fileList[0];

  const addFundRow = () => {
    setNoFund(false);
    setFundRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        projectNo: "",
        projectName: "",
        unit: "",
        category: "",
        enName: "",
        fundName: "",
        remark: "",
      },
    ]);
  };

  const removeFundRow = (id: number) => {
    setFundRows((prev) => prev.filter((item) => item.id !== id));
  };

  const updateFundRow = (id: number, key: keyof FundRow, value: string) => {
    setFundRows((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const addAuthorRow = () => {
    setAuthorRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: "",
        institution: "",
        department: "",
        address: "",
        phone: "",
        email: "",
        isCorresponding: false,
      },
    ]);
  };

  const removeAuthorRow = (id: number) => {
    setAuthorRows((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length > 0 && !next.some((a) => a.isCorresponding)) {
        next[0] = { ...next[0], isCorresponding: true };
      }
      return next;
    });
  };

  const updateAuthorRow = (id: number, key: keyof AuthorRow, value: string | boolean) => {
    setAuthorRows((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, [key]: value }
          : key === "isCorresponding" && value === true
            ? { ...item, isCorresponding: false }
            : item,
      ),
    );
  };

  return (
    <div className="bg-white text-[#1d1d1f] min-h-screen flex flex-col">
      <HeaderBar />
      <main id="main-content" className="flex-1 mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8">
        <Row gutter={[24, 24]} align="middle" className="mb-8">
          <Col xs={24} lg={16}>
            <Text className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1538]">
              Online Submission
            </Text>
            <Title level={1} className="!mb-3 !mt-3 !font-medium !text-[#1f2937]">
              稿件投稿
            </Title>
            <Paragraph className="!mb-0 !max-w-3xl !text-[16px] !leading-relaxed !text-[#667085]">
              请填写稿件信息并上传文件。提交后可在作者中心查看状态、接收退修意见并上传修订稿。
            </Paragraph>
          </Col>
          <Col xs={24} lg={8} className="text-left lg:text-right">
            <Space wrap>
              <Tag bordered={false} color="red" className="px-3 py-1 bg-red-50 text-[#8B1538]">在线投稿</Tag>
              <Tag bordered={false} color="blue" className="px-3 py-1 bg-blue-50 text-blue-700">状态跟踪</Tag>
              <Tag bordered={false} color="gold" className="px-3 py-1 bg-yellow-50 text-yellow-700">退修回传</Tag>
            </Space>
          </Col>
        </Row>

        <Divider className="mb-12 border-[#e5e7eb]" />

        <section className="mb-10">
          <Descriptions
            title={<span className="text-[18px] font-medium text-[#1f2937]">操作人信息</span>}
            bordered
            size="middle"
            column={{ xs: 1, md: 3 }}
            className="bg-white"
            styles={{
              label: { width: 108, color: "#667085", backgroundColor: "#f8fafc" },
              content: { color: "#1f2937" },
            }}
          >
            <Descriptions.Item label="账号姓名">{user.real_name || "未填写"}</Descriptions.Item>
            <Descriptions.Item label="注册邮箱">{user.email}</Descriptions.Item>
            <Descriptions.Item label="默认单位">{user.institution || "未填写"}</Descriptions.Item>
          </Descriptions>
        </section>

        <Row gutter={[48, 48]} align="top">
          <Col xs={24} xl={16}>
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={submit}
              initialValues={{
                institution: user.institution || "",
              }}
            >
              <Space direction="vertical" size={48} className="flex w-full">
                
                {/* 稿件信息 */}
                <section>
                  <Title level={3} className="!mb-6 !font-normal !text-gray-900">稿件基本信息</Title>
                  <Row gutter={24}>
                    <Col xs={24}>
                      <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
                        <Input size="large" placeholder="请输入标题" className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="abstract" label="摘要" rules={[{ required: true, message: "请输入摘要" }]}>
                        <TextArea rows={6} showCount maxLength={1200} placeholder="请输入摘要" className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="keywords" label="关键词" rules={[{ required: true, message: "请输入关键词" }]}>
                        <Input size="large" placeholder="多个关键词用逗号分隔" className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="planCategory" label="计划栏目" rules={[{ required: true, message: "请选择计划栏目" }]}>
                        <Select size="large" placeholder="请选择" options={PLAN_OPTIONS} className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="contact" label="联系方式" rules={[{ required: true, message: "请输入联系方式" }]}>
                        <Input size="large" placeholder="手机号或邮箱" className="rounded-sm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="institution" label="单位">
                        <Input size="large" placeholder="工作单位" className="rounded-sm" />
                      </Form.Item>
                    </Col>
                  </Row>
                </section>

                <Divider className="!m-0 border-[#e5e7eb]" />

                {/* 上传文件 */}
                <section>
                  <Title level={3} className="!mb-6 !font-normal !text-gray-900">文件上传</Title>
                  <Form.Item
                    name="file"
                    rules={[
                      {
                        required: true,
                        message: "请上传稿件文件",
                        validator: (_, value) =>
                          value && Array.isArray(value) && value.length > 0
                            ? Promise.resolve()
                            : Promise.reject(new Error("请上传稿件文件")),
                      },
                    ]}
                    valuePropName="fileList"
                    getValueFromEvent={normFile}
                  >
                    <Upload.Dragger
                      maxCount={1}
                      beforeUpload={() => false}
                      accept=".docx,.doc,.pdf"
                      fileList={fileList}
                      showUploadList={false}
                      className="w-full block"
                      rootClassName="submit-upload"
                    >
                      <p className="ant-upload-drag-icon !mb-3">
                        <InboxOutlined className="text-[34px] text-[#8B1538]" />
                      </p>
                      <p className="ant-upload-text text-[16px] font-medium text-[#1f2937]">
                        点击或拖拽稿件文件到此处上传
                      </p>
                      <p className="ant-upload-hint text-[13px] leading-6 text-[#667085]">
                        支持单个主稿文件上传，仅接受 `.doc`、`.docx`、`.pdf` 格式，文件大小不超过 {MAX_FILE_SIZE_MB}MB。
                      </p>
                    </Upload.Dragger>
                  </Form.Item>

                  <div className="mt-6 bg-gray-50 p-5 rounded-sm border border-[#e5e7eb]">
                    <Descriptions size="small" column={{ xs: 1, md: 2 }} className="mb-0">
                      <Descriptions.Item label={<span className="text-gray-500">文件名</span>}>{selectedFile?.name || "未选择"}</Descriptions.Item>
                      <Descriptions.Item label={<span className="text-gray-500">文件大小</span>}>{formatBytes(selectedFile?.size)}</Descriptions.Item>
                      <Descriptions.Item label={<span className="text-gray-500">文件类型</span>}>
                        {selectedFile ? selectedFile.name.split(".").pop()?.toUpperCase() : "-"}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>

                  {previewError && <Alert message={previewError} type="warning" showIcon className="mt-6" />}

                  {previewType && (
                    <div className="mt-8">
                      <Text className="mb-4 block text-[15px] font-medium text-[#1d1d1f]">提交前预览</Text>
                      {previewType === "pdf" && previewUrl && (
                        <iframe
                          src={previewUrl}
                          title="PDF 预览"
                          className="h-[600px] w-full border border-[#e5e7eb] rounded-sm bg-white shadow-sm"
                        />
                      )}
                      {previewType === "docx" && (
                        <div className="max-h-[600px] overflow-y-auto rounded-sm border border-[#e5e7eb] shadow-sm bg-white p-6 text-[15px] leading-relaxed text-[#2c2c2e]">
                          {docxPreviewText ? (
                            <pre className="whitespace-pre-wrap font-sans">{docxPreviewText}</pre>
                          ) : (
                            <Text type="secondary">正在解析 DOCX 预览...</Text>
                          )}
                        </div>
                      )}
                      {previewType === "doc" && (
                        <Alert
                          message="已选择 .doc 文件，可直接提交。由于浏览器限制，暂不支持 .doc 在线预览。"
                          type="info"
                          showIcon
                        />
                      )}
                    </div>
                  )}
                </section>

                <Divider className="!m-0 border-[#e5e7eb]" />

                {/* 基金与作者信息 */}
                <section>
                   <div className="flex items-center justify-between mb-6">
                      <Title level={3} className="!mb-0 !font-normal !text-gray-900">基金信息与作者署名</Title>
                   </div>
                   
                   <div className="mb-10">
                      <div className="flex items-center justify-between mb-4">
                        <Text strong className="text-[15px]">基金资助情况</Text>
                        <Space>
                          <Checkbox checked={noFund} onChange={(e) => setNoFund(e.target.checked)}>无基金信息</Checkbox>
                        </Space>
                      </div>
                      
                      {!noFund && (
                        <>
                          <div className="mb-4 overflow-x-auto rounded-sm border border-[#e5e7eb]">
                            <div className="min-w-[980px]">
                              <div className="grid grid-cols-[70px_120px_140px_150px_120px_150px_150px_110px_70px] bg-gray-50 text-center text-sm font-medium text-gray-700">
                                <div className="border-r border-[#e5e7eb] py-3">序号</div>
                                <div className="border-r border-[#e5e7eb] py-3">项目号</div>
                                <div className="border-r border-[#e5e7eb] py-3">项目名称</div>
                                <div className="border-r border-[#e5e7eb] py-3">立项单位/部门</div>
                                <div className="border-r border-[#e5e7eb] py-3">项目类别</div>
                                <div className="border-r border-[#e5e7eb] py-3">项目英文</div>
                                <div className="border-r border-[#e5e7eb] py-3">基金名称</div>
                                <div className="border-r border-[#e5e7eb] py-3">项目备注</div>
                                <div className="py-3">操作</div>
                              </div>
                              {fundRows.map((row, idx) => (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-[70px_120px_140px_150px_120px_150px_150px_110px_70px] border-t border-[#e5e7eb] group hover:bg-gray-50 transition-colors"
                                >
                                  <div className="border-r border-[#e5e7eb] px-2 py-3 text-center text-sm text-gray-500">{idx + 1}</div>
                                  <Input bordered={false} className="rounded-none focus:bg-white" value={row.projectNo} onChange={(e) => updateFundRow(row.id, "projectNo", e.target.value)} />
                                  <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.projectName} onChange={(e) => updateFundRow(row.id, "projectName", e.target.value)} />
                                  <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.unit} onChange={(e) => updateFundRow(row.id, "unit", e.target.value)} />
                                  <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.category} onChange={(e) => updateFundRow(row.id, "category", e.target.value)} />
                                  <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.enName} onChange={(e) => updateFundRow(row.id, "enName", e.target.value)} />
                                  <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.fundName} onChange={(e) => updateFundRow(row.id, "fundName", e.target.value)} />
                                  <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.remark} onChange={(e) => updateFundRow(row.id, "remark", e.target.value)} />
                                  <div className="flex items-center justify-center border-l border-[#e5e7eb]">
                                    <Button danger type="text" size="small" onClick={() => removeFundRow(row.id)}>删除</Button>
                                  </div>
                                </div>
                              ))}
                              {fundRows.length === 0 && (
                                <div className="text-center py-6 text-gray-400 border-t border-[#e5e7eb]">暂无基金数据，请添加</div>
                              )}
                            </div>
                          </div>
                          <Button onClick={addFundRow} type="dashed" className="w-full">
                            + 新增一条基金信息
                          </Button>
                        </>
                      )}
                   </div>

                   <div>
                      <div className="flex items-center justify-between mb-4">
                        <Text strong className="text-[15px]">作者署名与排序</Text>
                      </div>
                      <div className="mb-4 overflow-x-auto rounded-sm border border-[#e5e7eb]">
                        <div className="min-w-[1100px]">
                          <div className="grid grid-cols-[90px_100px_120px_170px_140px_210px_150px_180px_70px] bg-gray-50 text-center text-sm font-medium text-gray-700">
                            <div className="border-r border-[#e5e7eb] py-3">署名顺序</div>
                            <div className="border-r border-[#e5e7eb] py-3">通讯作者</div>
                            <div className="border-r border-[#e5e7eb] py-3">姓名</div>
                            <div className="border-r border-[#e5e7eb] py-3">工作单位</div>
                            <div className="border-r border-[#e5e7eb] py-3">部门/院系</div>
                            <div className="border-r border-[#e5e7eb] py-3">地址及邮编</div>
                            <div className="border-r border-[#e5e7eb] py-3">联系电话</div>
                            <div className="border-r border-[#e5e7eb] py-3">E-mail</div>
                            <div className="py-3">操作</div>
                          </div>
                          {authorRows.map((row, idx) => (
                            <div
                              key={row.id}
                              className="grid grid-cols-[90px_100px_120px_170px_140px_210px_150px_180px_70px] border-t border-[#e5e7eb] group hover:bg-gray-50 transition-colors"
                            >
                              <div className="border-r border-[#e5e7eb] px-2 py-3 text-center text-sm text-gray-500">第 {idx + 1} 作者</div>
                              <div className="flex items-center justify-center border-r border-[#e5e7eb]">
                                <Checkbox
                                  checked={row.isCorresponding}
                                  onChange={(e) => updateAuthorRow(row.id, "isCorresponding", e.target.checked)}
                                />
                              </div>
                              <Input bordered={false} className="rounded-none focus:bg-white" value={row.name} onChange={(e) => updateAuthorRow(row.id, "name", e.target.value)} />
                              <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.institution} onChange={(e) => updateAuthorRow(row.id, "institution", e.target.value)} />
                              <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.department} onChange={(e) => updateAuthorRow(row.id, "department", e.target.value)} />
                              <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.address} onChange={(e) => updateAuthorRow(row.id, "address", e.target.value)} />
                              <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.phone} onChange={(e) => updateAuthorRow(row.id, "phone", e.target.value)} />
                              <Input bordered={false} className="rounded-none focus:bg-white border-l border-[#e5e7eb]" value={row.email} onChange={(e) => updateAuthorRow(row.id, "email", e.target.value)} />
                              <div className="flex items-center justify-center border-l border-[#e5e7eb]">
                                <Button danger type="text" size="small" onClick={() => removeAuthorRow(row.id)}>删除</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button onClick={addAuthorRow} type="dashed" className="w-full">
                        + 添加合作作者
                      </Button>
                   </div>
                </section>

                <Divider className="!m-0 border-[#e5e7eb]" />

                {/* 版权协议与提示 */}
                <section>
                   <div className="flex items-center justify-between mb-6">
                      <Title level={3} className="!mb-0 !font-normal !text-gray-900">版权转让协议</Title>
                      <Link href="/copyright" target="_blank" className="text-[#8B1538] hover:underline text-sm font-medium">
                        查看完整协议 →
                      </Link>
                   </div>
                   
                  <Paragraph className="!mb-4 !text-[15px] !text-[#667085]">
                    {COPYRIGHT_AGREEMENT_TITLE}
                  </Paragraph>
                  <div className="max-h-60 overflow-y-auto rounded-sm border border-[#e5e7eb] bg-gray-50 px-6 py-5 text-[14px] leading-7 text-[#4b5563]">
                    {COPYRIGHT_AGREEMENT_PARAGRAPHS.map((p, i) => (
                      <p key={i} className={i > 0 ? "mt-4" : ""}>
                        {p}
                      </p>
                    ))}
                  </div>

                  <Form.Item
                    name="agreeCopyright"
                    valuePropName="checked"
                    className="!mb-0 !mt-6"
                    rules={[
                      {
                        required: true,
                        message: "请阅读并勾选同意《版权转让协议》",
                        transform: (v) => v,
                        validator: (_, value) =>
                          value
                            ? Promise.resolve()
                            : Promise.reject(new Error("请阅读并勾选同意《版权转让协议》")),
                      },
                    ]}
                  >
                    <Checkbox className="text-[15px] text-gray-800 font-medium">{COPYRIGHT_AGREEMENT_CHECKBOX_LABEL}</Checkbox>
                  </Form.Item>
                </section>

                {error && <Alert message={error} type="error" showIcon />}

                {/* 底部操作区 */}
                <div className="flex flex-wrap items-center justify-end gap-4 border-t border-[#e5e7eb] pt-8">
                  <Button size="large" onClick={() => router.back()} className="rounded-sm px-8">
                    返回上一页
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    className="bg-[#8B1538] hover:!bg-[#A51D45] rounded-sm px-12 border-none h-10 shadow-md"
                  >
                    {loading ? "提交中…" : "确认无误，提交稿件"}
                  </Button>
                </div>

              </Space>
            </Form>
          </Col>

          {/* 右侧信息面板 */}
          <Col xs={24} xl={8}>
            <Space direction="vertical" size={32} className="flex w-full xl:sticky xl:top-8 mt-12 xl:mt-0">
              <Card title="提交前自检清单" styles={{ body: { padding: 20 } }}>
                <List
                  size="small"
                  dataSource={[
                    "文档标题、摘要、关键词已正确填写",
                    "稿件文件格式符合 DOC/DOCX/PDF 标准",
                    `单文件尺寸不超过系统 ${MAX_FILE_SIZE_MB}MB 限制`,
                    "作者署名顺序及通讯作者已确认",
                    "已阅读全文并勾选版权转让协议",
                  ]}
                  renderItem={(item) => (
                    <List.Item className="!px-0 !border-b-0 py-1.5 flex items-start gap-2">
                       <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-50 text-green-600 text-xs shrink-0 mt-0.5">✓</span>
                       <span className="text-gray-600 text-sm leading-relaxed">{item}</span>
                    </List.Item>
                  )}
                />
              </Card>

              <Alert
                type="info"
                showIcon
                message="下一步提交流程"
                description="成功提交后，系统将自动对稿件进行机器初步解析，之后可随时在作者中心追踪稿件录用、外审情况及专家退修意见。"
                action={
                  <Link href="/author">
                    <Button size="small">前往我的作者中心</Button>
                  </Link>
                }
              />

            </Space>
          </Col>
        </Row>
      </main>
    </div>
  );
}
