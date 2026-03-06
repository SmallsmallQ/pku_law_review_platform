"use client";

import Link from "next/link";

/** 侧栏竖向快捷入口按钮，仿期刊首页「作者投稿」「编辑审稿」*/
export default function QuickActionButton({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-lg bg-[#5a6c7d] px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-[#4a5c6d]"
    >
      {icon ?? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white/20 text-lg">
          📄
        </span>
      )}
      {children}
    </Link>
  );
}
