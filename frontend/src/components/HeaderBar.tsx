"use client";

import Link from "next/link";
import {
  AppstoreOutlined,
  AuditOutlined,
  BookOutlined,
  HomeOutlined,
  MenuOutlined,
  RobotOutlined,
  SendOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
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
  if (pathname.startsWith("/guide")) return "/guide";
  if (pathname.startsWith("/copyright")) return "/copyright";
  if (pathname.startsWith("/ai-detect")) return "/ai-detect";
  return pathname;
}

function getMenuItems(isAdmin: boolean): MenuProps["items"] {
  const workspaceChildren: NonNullable<MenuProps["items"]> = [
    {
      key: "workspace-group-main",
      type: "group",
      label: "工作台入口",
      children: [
        { key: "/author", label: "作者中心", icon: <TeamOutlined /> },
        { key: "/editor", label: "编辑工作台", icon: <AuditOutlined /> },
      ],
    },
  ];

  if (isAdmin) {
    workspaceChildren.push({
      key: "workspace-group-admin",
      type: "group",
      label: "管理入口",
      children: [{ key: "/admin", label: "管理后台", icon: <SettingOutlined /> }],
    });
  }

  return [
    { key: "/", label: "首页", icon: <HomeOutlined /> },
    {
      key: "submission",
      label: "投稿服务",
      icon: <SendOutlined />,
      children: [
        {
          key: "submission-group-entry",
          type: "group",
          label: "投稿办理",
          children: [
            { key: "/submit", label: "投稿入口", icon: <SendOutlined /> },
            { key: "/guide", label: "投稿须知", icon: <BookOutlined /> },
            { key: "/copyright", label: "版权协议", icon: <BookOutlined /> },
          ],
        },
      ],
    },
    {
      key: "workspace",
      label: "工作台",
      icon: <AppstoreOutlined />,
      children: workspaceChildren,
    },
    { key: "/ai-detect", label: "AI 检测", icon: <RobotOutlined /> },
  ];
}

export default function HeaderBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const screens = useBreakpoint();
  const selectedKey = getSelectedKey(pathname);
  const menuItems = useMemo(() => getMenuItems(user?.role === "admin"), [user?.role]);
  const isReviewStaff =
    !!user?.role && REVIEW_STAFF_ROLES.includes(user.role as (typeof REVIEW_STAFF_ROLES)[number]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (typeof key === "string" && key.startsWith("/")) {
      router.push(key);
    }
  };

  return (
    <Header className="app-header !h-auto !bg-white !px-0 !py-0 !leading-none border-b border-[#e5e7eb]">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0 shrink-0">
          <Link href="/" className="block text-[#111827] no-underline">
            <Text className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B1538]">
              北京大学法学院主办
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
            onClick={onMenuClick}
            items={menuItems}
            className="site-header-menu site-header-menu-desktop min-w-0 flex-1"
          />
        ) : (
          <div className="flex flex-1 justify-end">
            <Button icon={<MenuOutlined />} onClick={() => setMobileOpen(true)} className="rounded-sm" />
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
          defaultOpenKeys={["submission", "workspace"]}
          items={menuItems}
          onClick={(info) => {
            onMenuClick(info);
            setMobileOpen(false);
          }}
          className="site-header-menu-mobile !border-0"
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
