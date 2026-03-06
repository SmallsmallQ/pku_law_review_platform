import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "投稿 - 中外法学智能编审系统",
  description: "在线投稿，提交稿件至《中外法学》",
};

export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
