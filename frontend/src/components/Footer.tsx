"use client";

import Link from "next/link";
import { Space } from "antd";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[#f0f0f0] bg-white py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-[#666]">
            <span>编辑部：北京市海淀区颐和园路 5 号北京大学法学院</span>
            <span className="mx-2">·</span>
            <span>电话 (8610) 62751691</span>
            <span className="mx-2">·</span>
            <span>邮箱 journal@law.pku.edu.cn</span>
          </div>
          <Space size="middle">
            <Link href="/" className="text-sm text-[#8B1538] hover:underline">
              首页
            </Link>
            <Link href="/submit" className="text-sm text-[#8B1538] hover:underline">
              投稿入口
            </Link>
            <Link href="/author" className="text-sm text-[#8B1538] hover:underline">
              作者中心
            </Link>
            <Link href="/copyright" className="text-sm text-[#8B1538] hover:underline">
              版权转让协议
            </Link>
            <Link href="/login" className="text-sm text-[#8B1538] hover:underline">
              登录
            </Link>
          </Space>
        </div>
        <div className="mt-4 text-center text-xs text-[#999]">
          版权所有 © 中外法学 · 智能编审系统
        </div>
      </div>
    </footer>
  );
}
