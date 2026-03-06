"use client";

import Link from "next/link";
import { Button, Result } from "antd";
import HeaderBar from "@/components/HeaderBar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <HeaderBar />
      <main className="flex-1 flex items-center justify-center px-4">
        <Result
          status="404"
          title="404"
          subTitle="抱歉，您访问的页面不存在。"
          extra={
            <Link href="/">
              <Button type="primary">返回首页</Button>
            </Link>
          }
        />
      </main>
    </div>
  );
}
