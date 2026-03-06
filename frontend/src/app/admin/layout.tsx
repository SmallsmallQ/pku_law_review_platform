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
    <div className="min-h-screen flex flex-col bg-[#f9f8f5]">
      <HeaderBar />
      <Layout className="flex-1 mx-auto w-full max-w-6xl px-4 py-4">
        <div className="flex gap-6 w-full">
          {/* Tabler-style 侧边栏 */}
          <aside className="w-52 shrink-0">
            <div className="rounded-lg border border-[#e0ddd8] bg-white p-2 shadow-sm">
              <div className="px-3 py-2 text-xs font-semibold text-[#666] uppercase tracking-wider">
                管理后台
              </div>
              <Menu
                selectedKeys={[selectedKey]}
                mode="inline"
                className="!border-0"
                items={adminNavItems.map((item) => ({
                  key: item.key,
                  label: <Link href={item.key}>{item.label}</Link>,
                }))}
              />
            </div>
          </aside>
          <Content className="flex-1 min-w-0 rounded-lg border border-[#e0ddd8] bg-white p-6 shadow-sm">
            {children}
          </Content>
        </div>
      </Layout>
    </div>
  );
}
