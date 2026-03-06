"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const BASE = "中外法学智能编审系统";
const TITLES: Record<string, string> = {
  "/": BASE,
  "/login": `登录 - ${BASE}`,
  "/register": `注册 - ${BASE}`,
  "/submit": `投稿 - ${BASE}`,
  "/author": `作者中心 - ${BASE}`,
  "/editor": `编辑工作台 - ${BASE}`,
  "/admin": `管理后台 - ${BASE}`,
  "/copyright": `版权转让协议 - ${BASE}`,
};

function getTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/admin")) return `管理后台 - ${BASE}`;
  if (pathname.startsWith("/author")) return `作者中心 - ${BASE}`;
  if (pathname.startsWith("/editor")) return `编辑工作台 - ${BASE}`;
  return BASE;
}

export default function DocumentTitle() {
  const pathname = usePathname();
  useEffect(() => {
    document.title = getTitle(pathname || "/");
  }, [pathname]);
  return null;
}
