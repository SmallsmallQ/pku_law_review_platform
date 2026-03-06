"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#dde1e8] bg-[#f5f6f8] py-11" role="contentinfo">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="text-[16px] leading-9 text-[#5f6573]">
          <span className="font-semibold text-[#394050]">编辑部：</span>
          北京市海淀区颐和园路 5 号北京大学法学院
          <span className="mx-2">·</span>
          电话 (8610) 62751691
          <span className="mx-2">·</span>
          <a href="mailto:journal@law.pku.edu.cn" className="text-[#8B1538] hover:underline">
            journal@law.pku.edu.cn
          </a>
        </div>

        <nav aria-label="页脚导航" className="mt-5 flex flex-wrap gap-6 text-[16px]">
          <Link href="/" className="text-[#8B1538] hover:underline">首页</Link>
          <Link href="/submit" className="text-[#8B1538] hover:underline">投稿入口</Link>
          <Link href="/author" className="text-[#8B1538] hover:underline">作者中心</Link>
          <Link href="/copyright" className="text-[#8B1538] hover:underline">版权转让协议</Link>
          <Link href="/login" className="text-[#8B1538] hover:underline">登录</Link>
        </nav>

        <p className="mt-8 text-center text-[15px] text-[#8b909b]">版权所有 © 中外法学 · 智能编审系统</p>
      </div>
    </footer>
  );
}
