"use client";

import Link from "next/link";
import { MenuOutlined } from "@ant-design/icons";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Grid, Layout, Menu, Space, Typography } from "antd";
import type { MenuProps } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { REVIEW_STAFF_ROLES, ROLE_MAP } from "@/lib/constants";

const { Header } = Layout;
const { useBreakpoint } = Grid;
const { Text } = Typography;

function getSelectedKey(pathname: string) {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/author")) return "/author";
  if (pathname.startsWith("/editor")) return "/editor";
  if (pathname.startsWith("/submit")) return "/submit";
  if (pathname.startsWith("/ai-detect")) return "/ai-detect";
  return pathname;
}

function getMenuItems(isAdmin: boolean): MenuProps["items"] {
  const items: MenuProps["items"] = [
    { key: "/", label: <Link href="/">首页</Link> },
    { key: "/submit", label: <Link href="/submit">投稿入口</Link> },
    { key: "/author", label: <Link href="/author">作者中心</Link> },
    { key: "/editor", label: <Link href="/editor">编辑工作台</Link> },
    { key: "/ai-detect", label: <Link href="/ai-detect">AI 检测</Link> },
  ];

  if (isAdmin) {
    items.push({ key: "/admin", label: <Link href="/admin">管理后台</Link> });
  }

  return items;
}

export default function HeaderBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const screens = useBreakpoint();
  const selectedKey = getSelectedKey(pathname);
  const menuItems = useMemo(() => getMenuItems(user?.role === "admin"), [user?.role]);
  const isReviewStaff =
    !!user?.role && REVIEW_STAFF_ROLES.includes(user.role as (typeof REVIEW_STAFF_ROLES)[number]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <Header className="app-header !h-auto !bg-white !px-0 !py-0 !leading-none border-b border-[#e5e7eb]">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="min-w-0 shrink-0">
          <Link href="/" className="block text-[#111827] no-underline">
            <Text className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B1538]">
              Peking University Law Journal
            </Text>
            <Text className="font-serif-sc block text-[20px] font-semibold text-[#1f2937]">
              《中外法学》
            </Text>
          </Link>
        </div>

        {screens.lg ? (
          <Menu
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={menuItems}
            className="site-header-menu min-w-0 flex-1"
          />
        ) : (
          <div className="flex flex-1 justify-end">
            <Button icon={<MenuOutlined />} onClick={() => setMobileOpen(true)} />
          </div>
        )}

        {screens.lg ? (
          <Space size="middle" className="shrink-0">
            <a
              href="https://www.law.pku.edu.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#667085] hover:text-[#8B1538]"
            >
              学院主页
            </a>
            {!loading && user ? (
              <>
                <Text className="max-w-[220px] truncate text-[#667085]">
                  {user.real_name || user.email}
                  {isReviewStaff && ` · ${ROLE_MAP[user.role] ?? user.role}`}
                </Text>
                <Button type="link" onClick={logout} className="!px-0">
                  退出
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button type="link">登录</Button>
                </Link>
                <Link href="/register">
                  <Button type="primary">注册</Button>
                </Link>
              </>
            )}
          </Space>
        ) : null}
      </div>

      <Drawer
        title="系统导航"
        placement="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        width={300}
      >
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={() => setMobileOpen(false)}
          className="!border-0"
        />
        <Space direction="vertical" size="middle" className="mt-6 flex w-full">
          <a
            href="https://www.law.pku.edu.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#667085] hover:text-[#8B1538]"
          >
            学院主页
          </a>
          {!loading && user ? (
            <>
              <Text className="text-[#667085]">
                {user.real_name || user.email}
                {isReviewStaff && ` · ${ROLE_MAP[user.role] ?? user.role}`}
              </Text>
              <Button onClick={logout}>退出</Button>
            </>
          ) : (
            <Space wrap>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button>登录</Button>
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                <Button type="primary">注册</Button>
              </Link>
            </Space>
          )}
        </Space>
      </Drawer>
    </Header>
  );
}
