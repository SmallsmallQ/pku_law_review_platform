"use client";

import Link from "next/link";
import { Button, Divider, Typography } from "antd";
import HeaderBar from "@/components/HeaderBar";
import {
  COPYRIGHT_AGREEMENT_TITLE,
  COPYRIGHT_AGREEMENT_PARAGRAPHS,
} from "@/lib/copyrightAgreement";

const { Title, Paragraph } = Typography;

export default function CopyrightPage() {
  return (
    <div className="bg-white min-h-screen text-[#1d1d1f]">
      <HeaderBar />
      <main className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Title level={2} className="!mb-4 !font-medium !text-[#1f2937]">
            {COPYRIGHT_AGREEMENT_TITLE}
          </Title>
          <Paragraph className="text-[#6b7280]">
            请在投稿前仔细阅读以下协议，提交稿件即代表您同意本协议的全部内容。
          </Paragraph>
        </div>
        
        <Divider className="!border-[#e5e7eb]" />

        <div className="space-y-6 text-[15px] leading-relaxed text-[#4b5563] mt-8">
          {COPYRIGHT_AGREEMENT_PARAGRAPHS.map((p, i) => (
            <Paragraph key={i} className="!mb-0 text-gray-700">
              {p}
            </Paragraph>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-[#e5e7eb] flex justify-center gap-4">
          <Link href="/">
            <Button size="large" className="rounded-sm px-8">
              返回首页
            </Button>
          </Link>
          <Link href="/submit">
            <Button type="primary" size="large" className="bg-[#8B1538] hover:!bg-[#A51D45] border-none rounded-sm px-10 shadow-sm">
              我已阅读，前往投稿
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
