"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Drawer, Layout, Menu, Space } from "antd";
import { useAuth } from "@/contexts/AuthContext";

const { Header } = Layout;

function getNavItems(isAdmin: boolean) {
  const items = [
    { key: "/", label: <Link href="/">首页</Link> },
    { key: "/submit", label: <Link href="/submit">投稿入口</Link> },
    { key: "/author", label: <Link href="/author">作者中心</Link> },
    { key: "/editor", label: <Link href="/editor">编辑工作台</Link> },
    { key: "/ai-detect", label: <Link href="/ai-detect">AI 检测</Link> },
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
  if (pathname.startsWith("/ai-detect")) return "/ai-detect";
  return pathname;
}

export default function HeaderBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const selectedKey = getSelectedKey(pathname);
  const navItems = getNavItems(user?.role === "admin");
  const isHomePage = pathname === "/";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <Header
      className={`app-header !relative !overflow-hidden !px-0 !py-0 !h-auto !min-h-[56px] ${isHomePage ? "!bg-white" : ""}`}
      style={isHomePage ? undefined : { background: "#8B1538" }}
    >
      {/* 非首页：与 banner 一致的背景图与叠层 */}
      {!isHomePage && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url(/banner.jpg), linear-gradient(135deg, #8B1538 0%, #5c0e26 50%, #70122e 100%)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0 z-0"
            style={{
              background: "linear-gradient(90deg, rgba(139,21,56,0.82) 0%, rgba(139,21,56,0.72) 52%, rgba(95,16,41,0.85) 100%)",
            }}
            aria-hidden
          />
          <div className="absolute inset-0 z-0 bg-[rgba(101,18,44,0.25)]" aria-hidden />
        </>
      )}
      <div className="relative z-10 w-full overflow-hidden px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex flex-nowrap items-center gap-3 overflow-hidden py-3">
          <Link
            href="/"
            className={`mr-2 block shrink-0 py-2 text-xl font-bold ${isHomePage ? "text-[#8B1538] hover:text-[#70122e]" : "text-white hover:text-white/90"}`}
          >
            《中外法学》智能编审系统
          </Link>
          {/* 桌面端：用 CSS 控制显示，避免刷新时因 breakpoint 未就绪出现两种导航 */}
          <div className="min-w-0 flex-1 overflow-hidden lg:block hidden">
            <Menu
              mode="horizontal"
              selectedKeys={[selectedKey]}
              items={navItems}
              disabledOverflow
              className={
                isHomePage
                  ? "!border-0 [&_.ant-menu-item]:!text-[#333]"
                  : "header-nav-menu !border-0 !bg-transparent [&_.ant-menu-item]:!text-white/95 [&_.ant-menu-item:hover]:!text-white [&_.ant-menu-item-selected]:!text-white"
              }
              style={{ lineHeight: "48px", minWidth: "max-content" }}
            />
          </div>
          <Button
            onClick={() => setMobileNavOpen((v) => !v)}
            className={`ml-auto shrink-0 lg:hidden ${isHomePage ? "" : "!border-white/6 !text-white hover:!border-white/3 hover:!text-white"}`}
          >
            {mobileNavOpen ? "收起导航" : "展开导航"}
          </Button>
          {/* 桌面端右侧：学院主页、用户、退出/登录等 */}
          <div className="hidden shrink-0 items-center gap-3 lg:!flex">
            <a
              href="https://www.law.pku.edu.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className={isHomePage ? "text-[#666] hover:text-[#8B1538]" : "text-white/90 hover:text-white"}
            >
              学院主页
            </a>
            {!loading && user && (
              <span className={isHomePage ? "max-w-[180px] truncate text-[#666]" : "max-w-[180px] truncate text-white/85"}>
                {user.real_name || user.email}
                {user.role !== "author" && ` · ${user.role === "editor" ? "编辑" : "管理员"}`}
              </span>
            )}
            {user ? (
              <Button
                type="link"
                onClick={logout}
                className={isHomePage ? "!text-[#666] hover:!text-[#8B1538] p-0" : "!text-white/90 hover:!text-white p-0"}
              >
                退出
              </Button>
            ) : (
              <Space size="small">
                <Link href="/login">
                  <Button type="link" className={isHomePage ? "!text-[#666] hover:!text-[#8B1538]" : "!text-white/90 hover:!text-white"}>
                    登录
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    type="primary"
                    size="small"
                    className={isHomePage ? "" : "!bg-white !text-[#8B1538] hover:!bg-white/95 hover:!text-[#70122e]"}
                  >
                    注册
                  </Button>
                </Link>
              </Space>
            )}
          </div>
        </div>
      </div>
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
    </Header>
  );
}
