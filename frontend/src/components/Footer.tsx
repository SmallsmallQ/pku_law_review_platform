"use client";

import Link from "next/link";
import { Space } from "antd";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[#f0f0f0] bg-white py-8" role="contentinfo">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <address className="not-italic text-sm text-[#666]">
            <span className="block sm:inline">编辑部：北京市海淀区颐和园路 5 号北京大学法学院</span>
            <span className="mx-2 hidden sm:inline">·</span>
            <span className="block mt-1 sm:mt-0 sm:inline">电话 (8610) 62751691</span>
            <span className="mx-2 hidden sm:inline">·</span>
            <a href="mailto:journal@law.pku.edu.cn" className="text-[#8B1538] hover:underline">
              journal@law.pku.edu.cn
            </a>
          </address>
          <nav aria-label="页脚导航">
            <Space size="middle" className="flex flex-wrap">
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
          </nav>
        </div>
        <p className="mt-4 text-center text-xs text-[#999]">
          版权所有 © 中外法学 · 智能编审系统
        </p>
      </div>
    </footer>
  );
}
