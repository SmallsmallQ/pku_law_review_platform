"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Layout, Menu } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";

const { Content } = Layout;

const adminNavItems = [
  { key: "/admin", label: "仪表盘" },
  { key: "/admin/manuscripts", label: "稿件总览" },
  { key: "/admin/users", label: "用户管理" },
  { key: "/admin/sections", label: "栏目管理" },
  { key: "/admin/templates", label: "退修模板" },
  { key: "/admin/config", label: "系统配置" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.push(`/login?returnUrl=${encodeURIComponent(pathname || "/admin")}`);
      return;
    }
  }, [user, loading, pathname, router]);

  if (loading) return null;
  if (!user || user.role !== "admin") return null;

  const selectedKey = pathname === "/admin" ? "/admin" : pathname;

  return (
    <div className="flex flex-col bg-[#f5f6f8]">
      <HeaderBar />
      <Layout className="flex-1 w-full px-5 py-4 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <div className="flex w-full gap-6 border-t border-[#dfe3ea] pt-4">
          <aside className="w-52 shrink-0 border-r border-[#dfe3ea] pr-4">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#666]">
              管理后台
            </div>
            <Menu
              selectedKeys={[selectedKey]}
              mode="inline"
              className="!border-0 !bg-transparent"
              items={adminNavItems.map((item) => ({
                key: item.key,
                label: <Link href={item.key}>{item.label}</Link>,
              }))}
            />
          </aside>
          <Content className="flex-1 min-w-0 p-2">
            {children}
          </Content>
        </div>
      </Layout>
    </div>
  );
}
