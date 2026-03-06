"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Checkbox, Form, Input, Spin, Typography, Upload } from "antd";
import type { UploadFile } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import {
  COPYRIGHT_AGREEMENT_CHECKBOX_LABEL,
  COPYRIGHT_AGREEMENT_PARAGRAPHS,
  COPYRIGHT_AGREEMENT_TITLE,
} from "@/lib/copyrightAgreement";
import { manuscriptsApi } from "@/services/api";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function SubmitPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [error, setError] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?returnUrl=/submit");
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#f9f8f5] flex items-center justify-center">
        <Spin size="large" tip="加载中…" />
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
      return name.endsWith(".docx") || name.endsWith(".doc") || name.endsWith(".pdf");
    });
    setFileList(valid);
    return valid;
  };

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <HeaderBar />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <Title level={4} className="!mb-6 !border-l-4 !border-[#8B1538] !pl-4">
            投稿
          </Title>
          <Form
            form={form}
            layout="vertical"
            onFinish={submit}
            requiredMark={false}
          >
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: "请输入论文标题" }]}
            >
              <Input placeholder="论文标题" size="large" />
            </Form.Item>
            <Form.Item name="abstract" label="摘要">
              <TextArea rows={4} placeholder="摘要" />
            </Form.Item>
            <Form.Item name="keywords" label="关键词">
              <Input placeholder="多个关键词用逗号分隔" />
            </Form.Item>
            <Form.Item name="institution" label="单位">
              <Input />
            </Form.Item>
            <Form.Item name="fund" label="基金项目">
              <Input />
            </Form.Item>
            <Form.Item name="contact" label="联系方式">
              <Input placeholder="邮箱或电话" />
            </Form.Item>
            <Form.Item
              label={
                <span className="flex items-center gap-2">
                  {COPYRIGHT_AGREEMENT_TITLE}
                  <Link href="/copyright" target="_blank" className="text-sm font-normal text-[#8B1538] hover:underline">
                    查看完整协议
                  </Link>
                </span>
              }
            >
              <div className="max-h-48 overflow-y-auto rounded border border-[#d9d9d9] bg-[#f9f8f5] px-4 py-3 text-sm text-[#333]">
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
                    value ? Promise.resolve() : Promise.reject(new Error("请阅读并勾选同意《版权转让协议》")),
                },
              ]}
            >
              <Checkbox>{COPYRIGHT_AGREEMENT_CHECKBOX_LABEL}</Checkbox>
            </Form.Item>
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
              >
                <Button>选择文件（.docx / .doc / .pdf）</Button>
              </Upload>
            </Form.Item>
            {error && (
              <Alert message={error} type="error" showIcon className="mb-4" />
            )}
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large">
                {loading ? "提交中…" : "提交投稿"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
