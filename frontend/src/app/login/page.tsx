"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";

const { Title, Text } = Typography;

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
    <div className="bg-[#f5f6f8]">
      <HeaderBar />
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <Title level={4} className="!mb-6 !border-l-4 !border-[#8B1538] !pl-4">
            登录
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
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password placeholder="请输入密码" size="large" />
            </Form.Item>
            {error && (
              <Alert message={error} type="error" showIcon className="mb-4" />
            )}
            <Form.Item className="!mb-4">
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                {loading ? "登录中…" : "登录"}
              </Button>
            </Form.Item>
          </Form>
          <div className="text-center">
            <Link href="/register">
              <Text type="secondary" className="hover:text-[#8B1538]">
                没有账号？去注册
              </Text>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
