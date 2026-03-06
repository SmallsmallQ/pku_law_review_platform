"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
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
                { min: 8, message: "至少 8 位" },
                { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: "需包含字母和数字" },
              ]}
            >
              <Input.Password placeholder="至少 8 位，需包含字母和数字" size="large" />
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
              <Input.Password placeholder="请再次输入密码" size="large" />
            </Form.Item>
            <Form.Item name="real_name" label="姓名">
              <Input placeholder="选填" size="large" />
            </Form.Item>
            <Form.Item name="institution" label="单位">
              <Input placeholder="选填" size="large" />
            </Form.Item>
            {error && (
              <Alert message={error} type="error" showIcon className="mb-4" />
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
