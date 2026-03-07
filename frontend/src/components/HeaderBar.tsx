"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Drawer, Grid, Layout, Menu, Space } from "antd";
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
  const screens = Grid.useBreakpoint();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const selectedKey = getSelectedKey(pathname);
  const navItems = getNavItems(user?.role === "admin");
  const isDesktop = !!screens.lg;

  useEffect(() => {
    if (isDesktop) {
      setMobileNavOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <Header className="!bg-white !px-0 !py-0 h-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className={`flex items-center gap-3 py-3 ${isDesktop ? "flex-nowrap" : "flex-wrap"}`}>
          <Link href="/" className="mr-2 block shrink-0 py-2 text-xl font-bold text-[#8B1538] hover:text-[#70122e]">
            《中外法学》智能编审系统
          </Link>
          {isDesktop ? (
            <div className="min-w-0 flex-1 overflow-x-auto">
              <Menu
                mode="horizontal"
                selectedKeys={[selectedKey]}
                items={navItems}
                disabledOverflow
                className="!border-0 [&_.ant-menu-item]:!text-[#333]"
                style={{ lineHeight: "48px", minWidth: "max-content" }}
              />
            </div>
          ) : (
            <Button onClick={() => setMobileNavOpen((v) => !v)} className="ml-auto">
              {mobileNavOpen ? "收起导航" : "展开导航"}
            </Button>
          )}
          {isDesktop && (
            <>
              <a
                href="https://www.law.pku.edu.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[#666] hover:text-[#8B1538]"
              >
                学院主页
              </a>
              {!loading && user && (
                <span className="max-w-[180px] truncate text-[#666]">
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
            </>
          )}
        </div>
      </div>
      {!isDesktop && (
        <Drawer
          title="导航"
          placement="left"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          width={280}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={navItems}
            className="!border-0 [&_.ant-menu-item]:!text-[#333]"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="mt-4 space-y-3">
            <a
              href="https://www.law.pku.edu.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[#666] hover:text-[#8B1538]"
            >
              学院主页
            </a>
            {!loading && user && (
              <div className="text-[#666]">
                {user.real_name || user.email}
                {user.role !== "author" && ` · ${user.role === "editor" ? "编辑" : "管理员"}`}
              </div>
            )}
            {user ? (
              <Button type="link" onClick={logout} className="!text-[#666] hover:!text-[#8B1538] !px-0">
                退出
              </Button>
            ) : (
              <Space size="small">
                <Link href="/login" onClick={() => setMobileNavOpen(false)}>
                  <Button type="link" className="!text-[#666] hover:!text-[#8B1538]">
                    登录
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileNavOpen(false)}>
                  <Button type="primary" size="small">
                    注册
                  </Button>
                </Link>
              </Space>
            )}
          </div>
        </Drawer>
      )}
    </Header>
  );
}
