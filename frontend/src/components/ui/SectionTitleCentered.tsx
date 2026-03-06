"use client";

import Link from "next/link";

/** 居中区块标题 + 两侧装饰线/三角，仿院庆网「百廿回眸・百廿拾忆」*/
export default function SectionTitleCentered({
  children,
  moreHref,
  moreLabel = "更多",
}: {
  children: React.ReactNode;
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <div className="relative mb-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
      <span className="inline-block h-px w-8 shrink-0 bg-[#c9a86c] sm:w-12" aria-hidden />
      <h2 className="text-center text-xl font-bold text-[#1a1a1a] sm:text-2xl">
        {children}
      </h2>
      <span className="inline-block h-px w-8 shrink-0 bg-[#c9a86c] sm:w-12" aria-hidden />
      {moreHref && (
        <Link
          href={moreHref}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-[#8B1538] hover:underline"
        >
          {moreLabel}
          <span className="ml-0.5">→</span>
        </Link>
      )}
    </div>
  );
}
