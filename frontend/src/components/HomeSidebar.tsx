"use client";

import Link from "next/link";
import { Button, Card, Input, List, Space } from "antd";

const SIDEBAR_NEWS = [
  { text: "本刊实行在线投稿，请通过「投稿入口」提交", href: "/submit" },
  { text: "作者可登录作者中心查看审稿状态与退修意见", href: "/author" },
  { text: "智能编审系统支持 AI 辅助初审，提升审稿效率", href: "/" },
];

const ACTIONS = [
  { label: "作者投稿", href: "/submit", primary: true },
  { label: "编辑审稿", href: "/editor", primary: true },
  { label: "专家审稿", href: "/editor", primary: true },
  { label: "主编审稿", href: "/editor", primary: true },
  { label: "原审稿系统", href: "https://www.law.pku.edu.cn/", primary: false, external: true },
];

export default function HomeSidebar() {
  return (
    <Space direction="vertical" size="middle" className="w-full">
      <Card title="站内搜索" size="small" className="!border-[#e0ddd8]">
        <Space.Compact className="w-full">
          <Input placeholder="关键词" allowClear />
          <Button type="primary" className="!bg-[#8B1538] hover:!bg-[#70122e]">
            搜索
          </Button>
        </Space.Compact>
        <div className="mt-2 flex gap-3 text-xs text-[#666]">
          <span>站内</span>
          <span>北大法宝</span>
        </div>
      </Card>

      <Card title="系统入口" size="small" className="!border-[#e0ddd8]">
        <Space direction="vertical" className="w-full" size="small">
          {ACTIONS.map((item) => (
            <Link key={item.label} href={item.href} className="block" {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              <Button
                block
                type={item.primary ? "primary" : "default"}
                className={
                  item.primary
                    ? "!bg-[#2563eb] hover:!bg-[#1d4ed8] !border-0"
                    : "!text-[#555] !border-[#d9d9d9] hover:!border-[#8B1538] hover:!text-[#8B1538]"
                }
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </Space>
      </Card>

      <Card
        title="新闻动态"
        size="small"
        extra={<Link href="/submit" className="text-xs text-[#8B1538]">MORE+</Link>}
        className="!border-[#e0ddd8]"
      >
        <List
          size="small"
          dataSource={SIDEBAR_NEWS}
          renderItem={(item) => (
            <List.Item className="!border-0 !px-0 !py-1.5">
              <Link href={item.href} className="text-[#555] hover:text-[#8B1538] text-sm line-clamp-2">
                {item.text}
              </Link>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
