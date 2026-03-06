"use client";

import Link from "next/link";
import { Button, Card, Space } from "antd";

const ACTIONS = [
  { label: "作者投稿", href: "/submit" },
  { label: "编辑审稿", href: "/editor" },
  { label: "作者中心", href: "/author" },
];

export default function HomeSidebar() {
  return (
    <Card title="系统入口" size="small" className="!border-[#e0ddd8]">
      <Space direction="vertical" className="w-full" size="middle">
        {ACTIONS.map((item) => (
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
