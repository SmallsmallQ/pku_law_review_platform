import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "版权转让协议 - 中外法学智能编审系统",
  description: "《中外法学》版权转让协议全文",
};

export default function CopyrightLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
