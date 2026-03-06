"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Form, Input, Typography } from "antd";
import { authApi } from "@/services/api";
import HeaderBar from "@/components/HeaderBar";

const { Title, Text } = Typography;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [error, setError] = useState("");

  const onFinish = async (values: {
    email: string;
    password: string;
    real_name?: string;
    institution?: string;
  }) => {
    setError("");
    setLoading(true);
    try {
      await authApi.register({
        email: values.email,
        password: values.password,
        real_name: values.real_name || undefined,
        institution: values.institution || undefined,
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <HeaderBar />
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <Title level={4} className="!mb-6 !border-l-4 !border-[#8B1538] !pl-4">
            作者注册
          </Title>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ required: true, message: "请输入邮箱" }, { type: "email", message: "请输入有效邮箱" }]}
            >
              <Input placeholder="请输入邮箱" size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: "请输入密码" },
                { min: 6, message: "至少 6 位" },
              ]}
            >
              <Input.Password placeholder="至少 6 位" size="large" />
            </Form.Item>
            <Form.Item name="real_name" label="姓名">
              <Input placeholder="选填" size="large" />
            </Form.Item>
            <Form.Item name="institution" label="单位">
              <Input placeholder="选填" size="large" />
            </Form.Item>
            {error && (
              <div className="mb-4 text-sm text-red-600">{error}</div>
            )}
            <Form.Item className="!mb-4">
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                {loading ? "注册中…" : "注册"}
              </Button>
            </Form.Item>
          </Form>
          <div className="text-center">
            <Link href="/login">
              <Text type="secondary" className="hover:text-[#8B1538]">
                已有账号？去登录
              </Text>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
