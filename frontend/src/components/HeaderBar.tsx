"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Input, Layout, Menu, Space } from "antd";
import { useAuth } from "@/contexts/AuthContext";

const { Header } = Layout;

function getNavItems(isAdmin: boolean) {
  const items = [
    { key: "/", label: <Link href="/">首页</Link> },
    { key: "/submit", label: <Link href="/submit">投稿入口</Link> },
    { key: "/author", label: <Link href="/author">作者中心</Link> },
    { key: "/editor", label: <Link href="/editor">编辑工作台</Link> },
  ];
  if (isAdmin) items.push({ key: "/admin", label: <Link href="/admin">管理后台</Link> });
  return items;
}

function getSelectedKey(pathname: string) {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/author")) return "/author";
  if (pathname.startsWith("/editor")) return "/editor";
  if (pathname.startsWith("/submit")) return "/submit";
  return pathname;
}

export default function HeaderBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const selectedKey = getSelectedKey(pathname);
  const navItems = getNavItems(user?.role === "admin");

  return (
    <Header className="!bg-white !px-0 !py-0 h-auto">
      {/* 顶栏 */}
      <div className="border-b border-[#ebeae6] bg-[#f9f8f5]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-4 px-4 py-2">
          <Input placeholder="站内搜索" allowClear className="mr-auto w-40 max-w-full sm:w-48" aria-label="站内搜索" />
          <a
            href="https://www.law.pku.edu.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#666] hover:text-[#8B1538]"
          >
            学院主页
          </a>
          {!loading && user && (
            <span className="text-[#666]">
              {user.real_name || user.email}
              {user.role !== "author" && ` · ${user.role === "editor" ? "编辑" : "管理员"}`}
            </span>
          )}
          {user ? (
            <Button type="link" onClick={logout} className="!text-[#666] hover:!text-[#8B1538] p-0">
              退出
            </Button>
          ) : (
            <Space size="small">
              <Link href="/login">
                <Button type="link" className="!text-[#666] hover:!text-[#8B1538]">
                  登录
                </Button>
              </Link>
              <Link href="/register">
                <Button type="primary" size="small">
                  注册
                </Button>
              </Link>
            </Space>
          )}
        </div>
      </div>
      {/* 主导航 */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#8B1538] hover:text-[#70122e] py-4 block">
            《中外法学》智能编审系统
          </Link>
          <Menu
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={navItems}
            className="!border-0 !min-w-0 flex-1 justify-end [&_.ant-menu-item]:!text-[#333]"
            style={{ lineHeight: "64px" }}
          />
        </div>
      </div>
    </Header>
  );
}
