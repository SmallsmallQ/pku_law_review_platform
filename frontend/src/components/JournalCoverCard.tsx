"use client";

import Link from "next/link";
import { Card, Typography } from "antd";

export default function JournalCoverCard() {
  return (
    <Card className="!rounded-none !border-[#d9dde4] !shadow-none" styles={{ body: { padding: 18 } }}>
      <div className="border border-[#e5e7ed] bg-[#fcfcfd] p-5 text-center">
        <Typography.Title level={4} className="!mb-0 !mt-0 !text-[#2d313d]">
          《中外法学》
        </Typography.Title>
        <div className="mt-2 text-[12px] tracking-[0.2em] text-[#666d7b]">PEKING UNIVERSITY LAW JOURNAL</div>
        <div className="mt-6 text-left text-sm text-[#6e7481]">© 2026</div>
        <Link href="/submit" className="mt-4 inline-block text-[16px] font-semibold text-[#8B1538] hover:underline">
          投稿入口 →
        </Link>
      </div>
    </Card>
  );
}
