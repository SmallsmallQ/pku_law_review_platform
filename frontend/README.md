# 前端 — Next.js + TypeScript + Tailwind CSS

与 [TailAdmin Next.js](https://tailadmin.com/nextjs) 同栈（Next.js + Tailwind），便于直接复用 TailAdmin 的布局与组件。

## 运行

```bash
npm install
npm run dev
```

浏览器打开 <http://localhost:3000>。开发时通过 `next.config.mjs` 的 rewrites 将 `/api/v1/*` 代理到后端 `http://localhost:8000`。

## 当前实现

- 已移除 Ant Design，全部改用 **Tailwind CSS** 样式，解决 `Module not found: 'antd'`。
- 页面：首页、登录/注册、投稿、作者中心、稿件详情与修订稿上传、编辑工作台与稿件详情与操作（退修/退稿/录用）。

## 接入母文件夹中的 TailAdmin 模板

若你把 TailAdmin Next.js 下载/克隆后放在**项目母文件夹**（与 `pku_law_review_platform` 同级），例如：

```
GitHub/
  pku_law_review_platform/   # 本仓库
    frontend/
  free-nextjs-admin-dashboard/   # 或 tailadmin-nextjs 等
```

可以二选一：

1. **替换为本前端**：把 TailAdmin 里的 `src/app` 下你需要的布局（如侧边栏、仪表盘样式）复制到本仓库 `frontend/src`，保留本仓库的 `src/app/login`、`src/app/author`、`src/app/editor`、`src/app/submit` 等路由与 API 调用，仅替换外壳和样式。
2. **以 TailAdmin 为主**：在 TailAdmin 项目里新增本系统的页面与 API 调用（把 `frontend/src/services/api.ts`、`frontend/src/contexts/AuthContext.tsx` 及各页面逻辑迁过去），并配置 rewrites 指向本后端。

本仓库前端已按 TailAdmin 技术栈（Next.js + Tailwind）实现，无需再安装 `antd`。
