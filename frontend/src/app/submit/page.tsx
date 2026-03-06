"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Spin,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import {
  COPYRIGHT_AGREEMENT_CHECKBOX_LABEL,
  COPYRIGHT_AGREEMENT_PARAGRAPHS,
  COPYRIGHT_AGREEMENT_TITLE,
} from "@/lib/copyrightAgreement";
import { manuscriptsApi } from "@/services/api";

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?returnUrl=/submit");
  }, [user, authLoading, router]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f8f5]">
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
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", String(values.title ?? ""));
      fd.append("abstract", String(values.abstract ?? ""));
      fd.append("keywords", String(values.keywords ?? ""));
      fd.append("author_info", "{}");
      fd.append("institution", String(values.institution ?? ""));
      fd.append("fund", String(values.fund ?? ""));
      fd.append("contact", String(values.contact ?? ""));
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f9f8f5]">
      <div className="pointer-events-none absolute left-[-12rem] top-[-10rem] h-[24rem] w-[24rem] rounded-full bg-[#8b1538]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-10rem] h-[22rem] w-[22rem] rounded-full bg-[#b57934]/10 blur-3xl" />
      <HeaderBar />

      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-16 pt-8">
        <Card className="mb-6 !overflow-hidden !border-none !bg-gradient-to-r !from-[#8b1538] !to-[#b22d53] !text-white shadow-xl">
          <Title level={3} className="!mb-2 !text-white">
            论文投稿
          </Title>
          <Paragraph className="!mb-0 !text-white/90">
            请完整填写稿件信息并上传正文文件。投稿成功后，可在作者中心跟踪审核进度。
          </Paragraph>
        </Card>

        <Card className="!border-none shadow-xl">
          <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
            <div className="mb-6 border-b border-[#eee] pb-5">
              <Title level={5} className="!mb-1 !text-[#8B1538]">
                稿件基础信息
              </Title>
              <Text type="secondary">以下信息将用于稿件登记与后续联系。</Text>
            </div>

            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: "请输入论文标题" }]}
            >
              <Input placeholder="请输入论文标题" size="large" />
            </Form.Item>

            <Form.Item name="abstract" label="摘要">
              <TextArea rows={5} placeholder="请填写中文摘要（建议 200-500 字）" showCount maxLength={1200} />
            </Form.Item>

            <Form.Item name="keywords" label="关键词">
              <Input placeholder="多个关键词请用中文逗号或英文逗号分隔" size="large" />
            </Form.Item>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Item name="institution" label="单位">
                <Input placeholder="例如：北京大学法学院" size="large" />
              </Form.Item>
              <Form.Item name="contact" label="联系方式">
                <Input placeholder="邮箱或手机号" size="large" />
              </Form.Item>
            </div>

            <Form.Item name="fund" label="基金项目">
              <Input placeholder="如无可留空" size="large" />
            </Form.Item>

            <div className="mb-6 mt-8 border-b border-[#eee] pb-5">
              <Title level={5} className="!mb-1 !text-[#8B1538]">
                版权协议
              </Title>
              <Text type="secondary">提交前请阅读并确认同意版权转让协议。</Text>
            </div>

            <Form.Item
              label={
                <span className="flex items-center gap-2">
                  {COPYRIGHT_AGREEMENT_TITLE}
                  <Link
                    href="/copyright"
                    target="_blank"
                    className="text-sm font-normal text-[#8B1538] hover:underline"
                  >
                    查看完整协议
                  </Link>
                </span>
              }
            >
              <div className="max-h-56 overflow-y-auto rounded-xl border border-[#e6d8dc] bg-[#fcfaf8] px-4 py-3 text-sm text-[#333]">
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

            <div className="mb-6 mt-8 border-b border-[#eee] pb-5">
              <Title level={5} className="!mb-1 !text-[#8B1538]">
                稿件上传
              </Title>
              <Text type="secondary">
                支持 .doc / .docx / .pdf 直接提交，单文件不超过 {MAX_FILE_SIZE_MB}MB。
              </Text>
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
                className="w-full"
              >
                <Button icon={<UploadOutlined />} size="large">
                  选择文件（.docx / .doc / .pdf）
                </Button>
              </Upload>
            </Form.Item>

            {previewError && (
              <Alert
                message={previewError}
                type="warning"
                showIcon
                className="mb-4"
              />
            )}

            {previewType && (
              <div className="mb-6 rounded-xl border border-[#ead8dd] bg-[#fffdfb] p-4">
                <Text className="mb-2 block text-sm font-medium text-[#8B1538]">
                  提交前预览
                </Text>
                {previewType === "pdf" && previewUrl && (
                  <iframe
                    src={previewUrl}
                    title="PDF 预览"
                    className="h-[480px] w-full rounded-lg border border-[#e6e0df] bg-white"
                  />
                )}
                {previewType === "docx" && (
                  <div className="max-h-[480px] overflow-y-auto rounded-lg border border-[#e6e0df] bg-white p-4 text-sm leading-7 text-[#222]">
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

            {error && <Alert message={error} type="error" showIcon className="mb-4" />}

            <Form.Item className="!mb-2 !mt-8">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                className="!h-11 !rounded-lg !border-0 !bg-[#8B1538] px-8 !font-medium hover:!bg-[#70122e]"
              >
                {loading ? "提交中…" : "提交投稿"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </main>
    </div>
  );
}
