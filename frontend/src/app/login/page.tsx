"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuditOutlined, SafetyCertificateOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Typography } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import AuthShell from "@/components/AuthShell";

const { Paragraph, Text, Title } = Typography;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [error, setError] = useState("");

  const onFinish = async (values: { email: string; password: string }) => {
    setError("");
    setLoading(true);
    try {
      await login(values.email, values.password);
      router.push(returnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account Access"
      title="登录系统"
      subtitle="统一进入作者中心、投稿入口与编辑工作台。表单区与说明区采用平面分栏，不做悬浮卡片。"
      highlights={[
        {
          icon: <ThunderboltOutlined />,
          title: "快速进入常用功能",
          description: "登录后可直接进入投稿、审稿跟踪、退修回传与编辑处理页面。",
        },
        {
          icon: <AuditOutlined />,
          title: "状态集中查看",
          description: "系统会将稿件状态、处理记录和退修意见统一收敛到个人中心。",
        },
        {
          icon: <SafetyCertificateOutlined />,
          title: "流程入口分明",
          description: "目录与全文以官网为准，本站主要负责编审流程和文档回传。",
        },
      ]}
      footer={
        <div className="text-center">
          <Link href="/register">
            <Text type="secondary" className="hover:text-[#8B1538]">
              没有账号？去注册
            </Text>
          </Link>
        </div>
      }
    >
      <Title level={4} className="!mb-2 !mt-0 !border-l-4 !border-[#8B1538] !pl-4">
        登录
      </Title>
      <Paragraph className="!mb-6 !text-[15px] !leading-7 !text-[#6c7280]">
        使用注册邮箱与密码登录。登录后可在作者中心查看稿件进度。
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
          rules={[{ required: true, message: "请输入密码" }]}
        >
          <Input.Password placeholder="请输入密码" size="large" className="!rounded-none" />
        </Form.Item>
        {error && <Alert message={error} type="error" showIcon className="mb-4 !rounded-none" />}
        <Form.Item className="!mb-0">
          <Button type="primary" htmlType="submit" loading={loading} block size="large" className="!rounded-none">
            {loading ? "登录中…" : "登录"}
          </Button>
        </Form.Item>
      </Form>
    </AuthShell>
  );
}
