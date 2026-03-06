"use client";

import Link from "next/link";
import { Button, Card, Space, Typography } from "antd";
import { useAuth } from "@/contexts/AuthContext";

const ACTIONS = [
  { label: "作者投稿", href: "/submit", desc: "提交论文" },
  { label: "编辑审稿", href: "/editor", desc: "AI 辅助初审" },
  { label: "作者中心", href: "/author", desc: "查看状态与退修" },
];

export default function HomeSidebar() {
  const { user } = useAuth();
  const isEditor = user?.role === "editor" || user?.role === "admin";
  let actions = [...ACTIONS];
  if (isEditor) {
    actions = [ACTIONS[1], ACTIONS[0], ACTIONS[2]];
  }
  if (user?.role === "admin") {
    actions = [...actions, { label: "管理后台", href: "/admin", desc: "系统配置" }];
  }

  return (
    <Card
      title={<span className="text-[20px] font-semibold text-[#2e3340]">系统入口</span>}
      extra={user && <Typography.Text className="text-sm text-[#7a7f8a]">已登录</Typography.Text>}
      className="!rounded-none !border-[#d9dde4] !shadow-none"
      styles={{ body: { padding: 16 } }}
    >
      <Typography.Paragraph className="!mb-3 !mt-0 text-sm text-[#626978]">
        投稿、审稿、查看进度
      </Typography.Paragraph>
      <Space direction="vertical" className="w-full" size="middle">
        {actions.map((item) => (
          <Link key={item.label} href={item.href} className="block">
            <Button
              block
              type="primary"
              size="large"
              className="!h-11 !rounded-md !border-0 !bg-[#8B1538] text-base hover:!bg-[#70122e]"
            >
              {item.label}
            </Button>
          </Link>
        ))}
      </Space>
    </Card>
  );
}
