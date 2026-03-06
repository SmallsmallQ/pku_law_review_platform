"use client";

import Link from "next/link";

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="面包屑" className="mb-4 text-sm text-[#666]">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2">/</span>}
          {item.href ? (
            <Link href={item.href} className="text-[#8B1538] hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#333]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
