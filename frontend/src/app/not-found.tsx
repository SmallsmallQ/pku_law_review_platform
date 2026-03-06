"use client";

import Link from "next/link";
import { Button, Result, Space } from "antd";
import HeaderBar from "@/components/HeaderBar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col">
      <HeaderBar />
      <main className="flex-1 flex items-center justify-center px-4">
        <Result
          status="404"
          title="404"
          subTitle="您访问的页面不存在，请检查链接或返回首页。"
          extra={
            <Space>
              <Link href="/">
                <Button type="primary" className="!bg-[#8B1538] hover:!bg-[#70122e]">返回首页</Button>
              </Link>
              <Link href="/submit">
                <Button>投稿入口</Button>
              </Link>
            </Space>
          }
        />
      </main>
    </div>
  );
}
