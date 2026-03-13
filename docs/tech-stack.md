# 技术选型说明 — 中外法学智能编审系统 v0.1

## 一、结论先行

**推荐组合（第一档，初版锁定）**：

- **前端**：Next.js + TypeScript + Tailwind CSS（与 [TailAdmin Next.js](https://tailadmin.com/nextjs) 同栈，便于后续接入 TailAdmin 模板或母文件夹中的模板）  
- **后端**：FastAPI + PostgreSQL  
- **向量检索**：pgvector  
- **文件存储**：MinIO / OSS  
- **任务队列**：初版先轻量（同步或简单后台任务），后续再加异步队列  
- **权限认证**：JWT 或 Session 均可，初版优先简单稳定  

选型原因不是「最潮」，而是**最适合本系统**：一半是后台业务（投稿、工作台、状态流转），一半是文档解析 + AI 审核 + 知识库。前端要兼顾投稿门户与编辑后台，后端要密集做 Word/PDF 解析、规则检查、向量化、模型调用，Python 生态更顺手，故后端用 FastAPI。

---

## 二、为什么前端用 Next.js + TypeScript + Ant Design

- 本系统是**「投稿门户 + 编辑后台」混合体**，不是纯官网也不是纯后台。Next.js 同时适合：页面路由与表单、登录态管理、服务端渲染、后续对外展示（首页、投稿须知、往期目录等）。  
- 官方以 **App Router** 为主，文件系统路由、布局体系、生产实践成熟，便于把首页、投稿页、作者中心、编辑工作台统一在一个项目里。  
- **TypeScript**：类型安全，接口与后端 API、状态结构对齐，减少联调错误。  
- **Ant Design 首选**：本场景是典型后台管理——表格、筛选、表单、抽屉、状态标签、审核面板多，Ant Design 上手快、后台味足。若后续更在意界面精致度，可再考虑 shadcn/ui。
- 前端视觉约束单独见 `frontend-style-guide.md`：当前项目统一采用**无悬浮、无阴影、平面分区**的 Ant Design 风格。  

---

## 三、为什么后端用 FastAPI（Python）

- 项目带有明显**「AI 后台服务」**属性：文档解析、规则引擎、向量检索、大模型调用才是重头，而不是单纯 CRUD。  
- FastAPI 基于 Python type hints，高性能、适合生产；更关键的是**贴近 Python 生态**：python-docx、PDF 解析、文本切块、embedding、规则引擎、大模型 SDK 都在 Python 里更自然。  
- 若后端用 Node（如 NestJS），业务接口好写，但一到文档解析、向量化、模型编排就容易绕路，最后往往再补一个 Python 服务；不如**一开始就把智能核心放在 Python 后端**。

---

## 四、为什么不是全栈 TypeScript（Next.js + NestJS）

- 也能做，但不是本项目的首选。  
- 本系统最重的不是传统业务逻辑，而是**文档与 AI 处理**。NestJS 做 CRUD 和权限没问题，但解析、向量化、模型编排在 Node 里生态和心智负担都更大，容易导致「再补一个 Python 服务」。  
- 因此**优先追求尽快做出能用的初版**时，更稳的组合是 **Next.js + FastAPI**。

---

## 五、各组件选型小结

| 组件 | 选型 | 说明 |
|------|------|------|
| 前端框架 | Next.js | App Router、门户+后台统一、SSR/生产实践 |
| 前端语言 | TypeScript | 类型安全、与 API 契约对齐 |
| 前端组件库 | Ant Design | 后台场景多，上手快；可后续换 shadcn/ui |
| 后端框架 | FastAPI | API 优先、Python 生态、文档与 AI 处理顺滑 |
| 数据库 | PostgreSQL | 主库；pgvector 做向量，初版不另起向量库 |
| 向量检索 | pgvector | 与 Postgres 同库，运维简单 |
| 文件存储 | MinIO / OSS | 稿件与补充材料；本地目录也可初版过渡 |
| 任务队列 | 初版轻量 | 同步或简单后台任务；后续可加 Celery/ARQ 等 |
| 认证 | JWT 或 Session | 初版优先简单稳定，不追求复杂 SSO |

---

## 六、与 PRD 的对应关系

- 本选型与 `PRD-v0.1.md` 第八章「技术选型」一致，并在此文档中**明确锁定**为上述组合。  
- 初版开发顺序仍按 PRD 第九章：先业务骨架，再解析与知识库，再 AI 报告，最后编辑工作台打通与管理员增强。
