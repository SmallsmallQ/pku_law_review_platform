"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileTextOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Typography } from "antd";
import { authApi } from "@/services/api";
import AuthShell from "@/components/AuthShell";

const { Paragraph, Text, Title } = Typography;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [error, setError] = useState("");

  const onFinish = async (values: {
    email: string;
    password: string;
    confirm_password: string;
    real_name?: string;
    institution?: string;
  }) => {
    setError("");
    if (values.password !== values.confirm_password) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        real_name: values.real_name?.trim() || undefined,
        institution: values.institution?.trim() || undefined,
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Author Onboarding"
      title="创建作者账号"
      subtitle="注册页也改成平面分区：说明区和表单区并列，强调边框和层级，不使用阴影和悬浮效果。"
      highlights={[
        {
          icon: <UserOutlined />,
          title: "先注册再完善",
          description: "姓名与单位可以先简填，后续可在作者中心继续补充完整资料。",
        },
        {
          icon: <FileTextOutlined />,
          title: "直接衔接投稿",
          description: "完成注册后即可进入投稿入口，在线提交稿件并上传附件。",
        },
        {
          icon: <SafetyCertificateOutlined />,
          title: "密码规则清晰",
          description: "密码至少 8 位，且需同时包含字母和数字，减少后续登录问题。",
        },
      ]}
      footer={
        <div className="text-center">
          <Link href="/login">
            <Text type="secondary" className="hover:text-[#8B1538]">
              已有账号？去登录
            </Text>
          </Link>
        </div>
      }
    >
      <Title level={4} className="!mb-2 !mt-0 !border-l-4 !border-[#8B1538] !pl-4">
        作者注册
      </Title>
      <Paragraph className="!mb-6 !text-[15px] !leading-7 !text-[#6c7280]">
        建议先填写常用邮箱。注册成功后，你可以继续完善作者资料，再提交稿件。
      </Paragraph>
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="email"
          label="邮箱"
          rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "请输入有效邮箱" }]}
        >
          <Input placeholder="请输入邮箱" size="large" className="!rounded-none" />
        </Form.Item>
        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: "请输入密码" },
            { min: 8, message: "至少 8 位" },
            { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: "需包含字母和数字" },
          ]}
        >
          <Input.Password placeholder="至少 8 位，需包含字母和数字" size="large" className="!rounded-none" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="确认密码"
          dependencies={["password"]}
          rules={[
            { required: true, message: "请再次输入密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("两次输入的密码不一致"));
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入密码" size="large" className="!rounded-none" />
        </Form.Item>
        <Form.Item name="real_name" label="姓名">
          <Input placeholder="选填" size="large" className="!rounded-none" />
        </Form.Item>
        <Form.Item name="institution" label="单位">
          <Input placeholder="选填" size="large" className="!rounded-none" />
        </Form.Item>
        {error && <Alert message={error} type="error" showIcon className="mb-4 !rounded-none" />}
        <Form.Item className="!mb-0">
          <Button type="primary" htmlType="submit" loading={loading} block size="large" className="!rounded-none">
            {loading ? "注册中…" : "注册"}
          </Button>
        </Form.Item>
      </Form>
    </AuthShell>
  );
}
