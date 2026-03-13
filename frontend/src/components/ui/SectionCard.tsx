"use client";

import Link from "next/link";

/** 区块标题：左侧红色竖条 + 可选「更多」链接或右侧内容，仿院庆网 */
export function SectionTitle({
  children,
  moreHref,
  moreLabel = "更多",
  extra,
}: {
  children: React.ReactNode;
  moreHref?: string;
  moreLabel?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e8e8] pb-3">
      <h2 className="border-l-4 border-[#8B1538] pl-4 text-lg font-bold text-[#1a1a1a]">
        {children}
      </h2>
      <div className="flex items-center gap-3">
        {extra}
        {moreHref && (
          <Link
            href={moreHref}
            className="text-sm text-[#8B1538] hover:underline"
          >
            {moreLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

/** 白底内容卡片：边框分区、无阴影、内边距，仿院庆网内容区 */
export default function SectionCard({
  children,
  className = "",
  title,
  moreHref,
  moreLabel,
  extra,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  moreHref?: string;
  moreLabel?: string;
  extra?: React.ReactNode;
}) {
  const isCompact = className.includes("p-0");
  return (
    <div
      className={`rounded-lg border border-[#e0e0e0] bg-white shadow-none ${isCompact ? "p-0" : "p-6"} ${className}`}
    >
      {title != null && (
        <div className={isCompact ? "px-6 pt-6" : undefined}>
          <SectionTitle moreHref={moreHref} moreLabel={moreLabel} extra={extra}>{title}</SectionTitle>
        </div>
      )}
      {children}
    </div>
  );
}
