"use client";

import Link from "next/link";
import { Card, Typography } from "antd";

/** 首页左侧期刊封面展示（参考《中外法学》官网） */
export default function JournalCoverCard() {
  return (
    <Card className="overflow-hidden !border-[#e0ddd8] shadow-sm" bodyStyle={{ padding: 0 }}>
      <div className="bg-[#faf9f6] p-5 text-center ring-1 ring-[#e8e6e1]">
        <Typography.Title level={5} className="!mb-0 !mt-0 font-serif !text-[#1a1a1a]">
          《中外法学》
        </Typography.Title>
        <div className="mt-1 text-[10px] tracking-widest text-[#555]">
          PEKING UNIVERSITY LAW JOURNAL
        </div>
        <div className="mt-3 text-left text-xs text-[#888]">① 2026</div>
        <Link href="/submit" className="mt-3 inline-block text-xs text-[#8B1538] hover:underline">
          投稿入口 →
        </Link>
      </div>
    </Card>
  );
}
