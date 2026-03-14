"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Divider, Layout, Space, Typography } from "antd";

const { Footer: LayoutFooter } = Layout;
const { Paragraph, Text } = Typography;

export default function Footer() {
  const pathname = usePathname();

  if (pathname === '/editor' || pathname.startsWith('/editor/')) {
    return null;
  }

  return (
    <LayoutFooter className="!bg-white !px-0 !py-7 border-t border-[#e5e7eb]" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Text className="block text-[12px] font-semibold uppercase tracking-[0.22em] text-[#8B1538]">
          Editorial Office
        </Text>
        <Paragraph className="!mb-0 !mt-2 !text-[14px] !leading-7 !text-[#667085]">
          北京市海淀区颐和园路 5 号北京大学法学院
          <span className="mx-2">·</span>
          电话 (8610) 62751691
          <span className="mx-2">·</span>
          <a href="mailto:journal@law.pku.edu.cn" className="text-[#8B1538] hover:underline">
            journal@law.pku.edu.cn
          </a>
        </Paragraph>

        <Divider className="!my-4 !border-[#eef0f3]" />

        <Space wrap size="large" aria-label="页脚导航">
          <Link href="/" className="text-[#8B1538] hover:underline">首页</Link>
          <Link href="/submit" className="text-[#8B1538] hover:underline">投稿入口</Link>
          <Link href="/author" className="text-[#8B1538] hover:underline">作者中心</Link>
          <Link href="/copyright" className="text-[#8B1538] hover:underline">版权转让协议</Link>
          <Link href="/login" className="text-[#8B1538] hover:underline">登录</Link>
        </Space>

        <Text className="mt-6 block text-center text-[13px] text-[#98a2b3]">
          版权所有 © 中外法学 · 智能编审系统
        </Text>
      </div>
    </LayoutFooter>
  );
}
