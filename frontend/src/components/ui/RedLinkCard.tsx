"use client";

import Link from "next/link";

type LinkItem = { label: string; href: string };

/** 深红底白字链接卡片，两列排列，仿院庆网左侧红块 */
export default function RedLinkCard({
  title,
  columns,
  className = "",
}: {
  title?: string;
  columns: LinkItem[][];
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-[#8B1538] bg-[#8B1538] p-6 text-white shadow-none ${className}`}
    >
      {title && (
        <h3 className="mb-4 border-b border-white/30 pb-2 text-base font-bold">
          {title}
        </h3>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        {columns.map((col, i) => (
          <ul key={i} className="space-y-2">
            {col.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2 text-white/95 hover:text-white hover:underline"
                >
                  <span className="text-white/80">—</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
