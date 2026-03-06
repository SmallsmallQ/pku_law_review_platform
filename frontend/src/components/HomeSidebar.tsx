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
      title="系统入口"
      size="small"
      className="!border-[#e0ddd8]"
      extra={user && <Typography.Text type="secondary" className="text-xs">已登录</Typography.Text>}
    >
      <Typography.Paragraph type="secondary" className="!mb-3 !mt-0 text-xs">
        投稿、审稿、查看进度
      </Typography.Paragraph>
      <Space direction="vertical" className="w-full" size="middle">
        {actions.map((item) => (
          <Link key={item.label} href={item.href} className="block">
            <Button
              block
              type="primary"
              size="middle"
              className="!bg-[#8B1538] hover:!bg-[#70122e] !border-0"
            >
              {item.label}
            </Button>
          </Link>
        ))}
      </Space>
    </Card>
  );
}
