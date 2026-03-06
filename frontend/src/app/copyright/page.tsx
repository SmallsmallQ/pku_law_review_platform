"use client";

import Link from "next/link";
import { Button, Card, Typography } from "antd";
import HeaderBar from "@/components/HeaderBar";
import {
  COPYRIGHT_AGREEMENT_TITLE,
  COPYRIGHT_AGREEMENT_PARAGRAPHS,
} from "@/lib/copyrightAgreement";

const { Title, Paragraph } = Typography;

export default function CopyrightPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <HeaderBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <Title level={4} className="!mb-6 !border-l-4 !border-[#8B1538] !pl-4">
            {COPYRIGHT_AGREEMENT_TITLE}
          </Title>
          <div className="space-y-4 text-[#333]">
            {COPYRIGHT_AGREEMENT_PARAGRAPHS.map((p, i) => (
              <Paragraph key={i} className="!mb-4 text-[#555] leading-relaxed">
                {p}
              </Paragraph>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-[#f0f0f0]">
            <Link href="/submit">
              <Button type="primary">去投稿</Button>
            </Link>
            <Link href="/" className="ml-2">
              <Button>返回首页</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
