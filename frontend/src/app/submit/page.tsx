"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Select,
  Spin,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import { UploadOutlined } from "@ant-design/icons";
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
      await manuscriptsApi.create(fd);
      router.push("/author?submitted=1");
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
    <div className="bg-[#f5f6f8] text-[#1d1d1f]">
      <HeaderBar />
      <main className="w-full px-5 pb-20 pt-10 sm:px-8 sm:pt-12 lg:px-10 xl:px-12 2xl:px-16">
        <section className="mb-8 border-b border-[#d9d9df] pb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
            在线投稿系统
          </p>
          <Title level={1} className="!mb-2 !text-[36px] !font-semibold !tracking-[-0.02em] !text-[#1d1d1f] sm:!text-[44px]">
            稿件投稿
          </Title>
          <Paragraph className="!mb-0 !max-w-[880px] !text-[16px] !leading-8 !text-[#515154]">
            请填写稿件信息并上传文件。提交后可在作者中心查看状态、接收退修意见并上传修订稿。
          </Paragraph>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="border border-[#d7d7dd] bg-white">
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={submit}
            initialValues={{
              institution: user.institution || "",
            }}
            className="p-6 sm:p-8"
          >
            <div className="mb-4 border-b border-[#e5e5e7] pb-3">
              <Text className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">稿件信息</Text>
            </div>

            <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
              <Input size="large" placeholder="请输入标题" className="!rounded-xl" />
            </Form.Item>

            <Form.Item name="abstract" label="摘要" rules={[{ required: true, message: "请输入摘要" }]}>
              <TextArea rows={7} showCount maxLength={1200} placeholder="请输入摘要" className="!rounded-xl" />
            </Form.Item>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Item name="keywords" label="关键词" rules={[{ required: true, message: "请输入关键词" }]}
              >
                <Input size="large" placeholder="多个关键词用逗号分隔" className="!rounded-xl" />
              </Form.Item>
              <Form.Item name="planCategory" label="计划栏目" rules={[{ required: true, message: "请选择计划栏目" }]}
              >
                <Select size="large" placeholder="请选择" options={PLAN_OPTIONS} className="[&_.ant-select-selector]:!rounded-xl" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Item name="contact" label="联系方式" rules={[{ required: true, message: "请输入联系方式" }]}
              >
                <Input size="large" placeholder="手机号或邮箱" className="!rounded-xl" />
              </Form.Item>
              <Form.Item name="institution" label="单位">
                <Input size="large" placeholder="工作单位" className="!rounded-xl" />
              </Form.Item>
            </div>

            <div className="mb-4 mt-10 border-b border-[#e5e5e7] pb-3">
              <Text className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">上传文件</Text>
            </div>

            <Form.Item
              name="file"
              label="稿件文件"
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
              <Upload
                maxCount={1}
                beforeUpload={() => false}
                accept=".docx,.doc,.pdf"
                fileList={fileList}
                showUploadList={false}
                className="w-full"
              >
                <Button icon={<UploadOutlined />} size="large" className="!h-11 !rounded-xl !px-5">
                  选择文件（.doc / .docx / .pdf）
                </Button>
              </Upload>
            </Form.Item>

            <div className="mb-5 border border-[#e5e5e7] bg-[#fafafe] px-5 py-4">
              <div className="grid grid-cols-1 gap-2 text-sm text-[#515154] sm:grid-cols-2">
                <p>文件名：{selectedFile?.name || "未选择"}</p>
                <p>文件大小：{formatBytes(selectedFile?.size)}</p>
                <p>文件类型：{selectedFile ? selectedFile.name.split(".").pop()?.toUpperCase() : "-"}</p>
                <p>大小限制：{MAX_FILE_SIZE_MB}MB</p>
              </div>
            </div>

            {previewError && <Alert message={previewError} type="warning" showIcon className="mb-4" />}

            {previewType && (
              <div className="mb-6 border border-[#e5e5e7] bg-[#fbfbfd] p-4 sm:p-5">
                <Text className="mb-3 block text-sm font-medium text-[#1d1d1f]">提交前预览</Text>
                {previewType === "pdf" && previewUrl && (
                  <iframe
                    src={previewUrl}
                    title="PDF 预览"
                    className="h-[520px] w-full border border-[#dedee3] bg-white"
                  />
                )}
                {previewType === "docx" && (
                  <div className="max-h-[520px] overflow-y-auto border border-[#dedee3] bg-white p-4 text-sm leading-7 text-[#2c2c2e]">
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

            <div className="mb-4 mt-10 border-b border-[#e5e5e7] pb-3">
              <Text className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">版权协议</Text>
            </div>

            <Form.Item
              label={
                <span className="flex items-center gap-2 text-sm text-[#1d1d1f]">
                  {COPYRIGHT_AGREEMENT_TITLE}
                  <Link href="/copyright" target="_blank" className="text-[#06c] hover:underline">
                    查看完整协议
                  </Link>
                </span>
              }
            >
              <div className="max-h-52 overflow-y-auto border border-[#e5e5e7] bg-[#fbfbfd] px-4 py-3 text-sm leading-7 text-[#3a3a3c]">
                {COPYRIGHT_AGREEMENT_PARAGRAPHS.map((p, i) => (
                  <p key={i} className={i > 0 ? "mt-3" : ""}>
                    {p}
                  </p>
                ))}
              </div>
            </Form.Item>

            <Form.Item
              name="agreeCopyright"
              valuePropName="checked"
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
              <Checkbox>{COPYRIGHT_AGREEMENT_CHECKBOX_LABEL}</Checkbox>
            </Form.Item>

            <div className="mb-4 mt-10 border-b border-[#e5e5e7] pb-3">
              <Text className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">基金信息</Text>
            </div>

            <div className="mb-5 overflow-x-auto border border-[#e5e5e7]">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[70px_120px_140px_150px_120px_150px_150px_110px_70px] bg-[#f7f7fa] text-center text-sm text-[#3a3a3c]">
                  <div className="border-r border-[#e5e5e7] py-2">序号</div>
                  <div className="border-r border-[#e5e5e7] py-2">项目号</div>
                  <div className="border-r border-[#e5e5e7] py-2">项目名称</div>
                  <div className="border-r border-[#e5e5e7] py-2">立项单位/部门</div>
                  <div className="border-r border-[#e5e5e7] py-2">项目类别</div>
                  <div className="border-r border-[#e5e5e7] py-2">项目英文名称</div>
                  <div className="border-r border-[#e5e5e7] py-2">基金名称</div>
                  <div className="border-r border-[#e5e5e7] py-2">项目备注</div>
                  <div className="py-2">删除</div>
                </div>
                {fundRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[70px_120px_140px_150px_120px_150px_150px_110px_70px] border-t border-[#e5e5e7]"
                  >
                    <div className="border-r border-[#e5e5e7] px-2 py-2 text-center text-sm">{idx + 1}</div>
                    <Input bordered={false} value={row.projectNo} onChange={(e) => updateFundRow(row.id, "projectNo", e.target.value)} />
                    <Input bordered={false} value={row.projectName} onChange={(e) => updateFundRow(row.id, "projectName", e.target.value)} />
                    <Input bordered={false} value={row.unit} onChange={(e) => updateFundRow(row.id, "unit", e.target.value)} />
                    <Input bordered={false} value={row.category} onChange={(e) => updateFundRow(row.id, "category", e.target.value)} />
                    <Input bordered={false} value={row.enName} onChange={(e) => updateFundRow(row.id, "enName", e.target.value)} />
                    <Input bordered={false} value={row.fundName} onChange={(e) => updateFundRow(row.id, "fundName", e.target.value)} />
                    <Input bordered={false} value={row.remark} onChange={(e) => updateFundRow(row.id, "remark", e.target.value)} />
                    <div className="flex items-center justify-center border-l border-[#e5e5e7]">
                      <Button danger type="text" onClick={() => removeFundRow(row.id)}>删</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Button onClick={addFundRow} className="!rounded-xl">添加基金</Button>
              <Checkbox checked={noFund} onChange={(e) => setNoFund(e.target.checked)}>无基金</Checkbox>
            </div>

            <div className="mb-4 mt-10 border-b border-[#e5e5e7] pb-3">
              <Text className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">作者信息</Text>
            </div>

            <div className="mb-5 overflow-x-auto border border-[#e5e5e7]">
              <div className="min-w-[1100px]">
                <div className="grid grid-cols-[90px_100px_120px_170px_140px_210px_150px_180px_70px] bg-[#f7f7fa] text-center text-sm text-[#3a3a3c]">
                  <div className="border-r border-[#e5e5e7] py-2">序号</div>
                  <div className="border-r border-[#e5e5e7] py-2">通讯作者</div>
                  <div className="border-r border-[#e5e5e7] py-2">姓名</div>
                  <div className="border-r border-[#e5e5e7] py-2">工作单位</div>
                  <div className="border-r border-[#e5e5e7] py-2">部门/院系</div>
                  <div className="border-r border-[#e5e5e7] py-2">地址及邮编</div>
                  <div className="border-r border-[#e5e5e7] py-2">电话或手机</div>
                  <div className="border-r border-[#e5e5e7] py-2">E-mail</div>
                  <div className="py-2">删除</div>
                </div>
                {authorRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[90px_100px_120px_170px_140px_210px_150px_180px_70px] border-t border-[#e5e5e7]"
                  >
                    <div className="border-r border-[#e5e5e7] px-2 py-2 text-center text-sm">{idx + 1}(作者)</div>
                    <div className="flex items-center justify-center border-r border-[#e5e5e7]">
                      <Checkbox
                        checked={row.isCorresponding}
                        onChange={(e) => updateAuthorRow(row.id, "isCorresponding", e.target.checked)}
                      />
                    </div>
                    <Input bordered={false} value={row.name} onChange={(e) => updateAuthorRow(row.id, "name", e.target.value)} />
                    <Input bordered={false} value={row.institution} onChange={(e) => updateAuthorRow(row.id, "institution", e.target.value)} />
                    <Input bordered={false} value={row.department} onChange={(e) => updateAuthorRow(row.id, "department", e.target.value)} />
                    <Input bordered={false} value={row.address} onChange={(e) => updateAuthorRow(row.id, "address", e.target.value)} />
                    <Input bordered={false} value={row.phone} onChange={(e) => updateAuthorRow(row.id, "phone", e.target.value)} />
                    <Input bordered={false} value={row.email} onChange={(e) => updateAuthorRow(row.id, "email", e.target.value)} />
                    <div className="flex items-center justify-center border-l border-[#e5e5e7]">
                      <Button danger type="text" onClick={() => removeAuthorRow(row.id)}>删</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Button onClick={addAuthorRow} className="!rounded-xl">添加作者</Button>
            </div>

            {error && <Alert message={error} type="error" showIcon className="mb-6" />}

            <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-[#e5e5e7] pt-6">
              <Button size="large" className="!h-11 !rounded-xl !px-6" onClick={() => router.back()}>
                返回
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                className="!h-11 !rounded-xl !border-0 !bg-[#1d1d1f] !px-7 hover:!bg-black"
              >
                {loading ? "提交中…" : "提交稿件"}
              </Button>
            </div>
          </Form>
          </div>

          <aside className="h-fit border border-[#d7d7dd] bg-white p-5 lg:sticky lg:top-6">
            <h3 className="mb-3 text-base font-semibold text-[#1d1d1f]">投稿信息</h3>
            <div className="space-y-2 text-sm leading-7 text-[#4c4c51]">
              <p>投稿人：{user.real_name || "未填写"}</p>
              <p>邮箱：{user.email}</p>
              <p>单位：{user.institution || "未填写"}</p>
            </div>
            <div className="my-4 border-t border-[#ececf1]" />
            <h4 className="mb-2 text-sm font-semibold text-[#1d1d1f]">提交前检查</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-7 text-[#515154]">
              <li>标题、摘要、关键词已填写</li>
              <li>稿件文件格式为 DOC/DOCX/PDF</li>
              <li>单文件大小不超过 20MB</li>
              <li>已勾选版权协议</li>
            </ul>
          </aside>
        </section>
      </main>
    </div>
  );
}
