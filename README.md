# 中外法学智能编审系统

面向法学期刊编辑部的 **投稿管理 + AI 辅助初审** 平台。作者在线投稿 → 系统解析与 AI 初审报告 → 编辑退修/录用/退稿，全流程闭环。

---

## 功能概览

| 模块       | 说明 |
|------------|------|
| **作者端** | 注册/登录、投稿（标题/摘要/关键词/主稿文件）、我的稿件列表与详情、查看退修意见、上传修订稿、下载稿件 |
| **编辑端** | 稿件列表与筛选、稿件详情与驾驶舱、查看 AI 初审报告、退修/退稿/录用、触发 AI 报告生成 |
| **管理后台** | 仪表盘统计、稿件总览与状态操作、用户管理（CRUD、角色/启用）、栏目管理、退修意见模板、系统配置（键值对） |
| **公开页** | 首页、投稿须知、版权转让协议、404 等 |

角色：**作者**（author）、**编辑**（editor）、**管理员**（admin）。仅 admin 可访问管理后台。

---

## 技术栈

| 层级   | 技术 |
|--------|------|
| 前端   | Next.js 14（App Router）+ TypeScript + Tailwind CSS + Ant Design 5 |
| 后端   | FastAPI + SQLAlchemy 2 + JWT |
| 数据库 | **已整合在项目内**：默认 SQLite（单文件，无需装数据库），生产可换 PostgreSQL |
| 文件   | 本地目录（可扩展 MinIO/OSS） |
| AI     | 阿里云百炼（OpenAI 兼容接口，可选） |

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/deploy.md](docs/deploy.md) | **服务器部署指南**：环境、Nginx、systemd、HTTPS、检查清单 |
| [docs/PRD-v0.1.md](docs/PRD-v0.1.md) | 产品需求：角色、流程、功能边界、AI 报告结构、开发顺序 |
| [docs/database-schema.md](docs/database-schema.md) | 数据库表设计：用户、稿件与版本、解析、报告、操作、知识库 |
| [docs/api-spec.md](docs/api-spec.md) | API 清单：认证、作者端、编辑端、管理员端、公开页 |
| [docs/tech-stack.md](docs/tech-stack.md) | 技术选型说明 |
| [docs/admin.md](docs/admin.md) | 管理后台功能与权限说明 |

---

## 环境要求

- **Node.js** 18+（前端，推荐 20/22 LTS；不建议 25+）
- **Python** 3.10+（后端）
- **无需单独安装数据库**：项目内置 SQLite，数据存成后端目录下一个文件；生产环境如需再换 PostgreSQL。

---

## 如何启动（本地已配好，一条命令）

本地运行已全部配好：默认配置在 `backend/.env`，启动脚本会自动生成 `.env`、安装依赖、建表并启动。

```bash
chmod +x scripts/start.sh   # 只需执行一次
./scripts/start.sh
```

- **前端**：<http://localhost:3000>
- **后端 API 文档**：<http://localhost:8000/docs>
- **健康检查**：<http://localhost:8000/health>

脚本会自动：生成 `backend/.env`、安装后端/前端依赖（首次）、建表（SQLite）、启动后端（8000）与前端（3000）。按 **Ctrl+C** 会同时停掉后端和前端。

---

### 首次使用（登录与角色）

1. **作者**：打开首页 → 注册 → 登录 → 投稿入口提交稿件。
2. **编辑**：在数据库中将某用户 `role` 改为 `editor`，或创建种子编辑账号：
   ```bash
   cd backend
   SEED_EDITOR_EMAIL=editor@test.com SEED_EDITOR_PASSWORD=yourpassword python -m scripts.init_db
   ```
   用该邮箱登录后可见「编辑工作台」。
3. **管理员**：将某用户 `role` 改为 `admin`，登录后顶栏出现「管理后台」，或直接访问 `/admin`。

---

## 环境变量（后端 `.env`）

| 变量 | 说明 | 默认 |
|------|------|------|
| `DATABASE_URL` | 数据库连接；**不配则用项目内置 SQLite**（`backend/law_review.db`），无需单独建库 | `sqlite:///./law_review.db` |
| `USE_SQLITE` | 为 `true` 时强制 SQLite（例如本机未装 PostgreSQL 时） | `false` |
| `SECRET_KEY` | JWT 密钥，生产务必修改 | `change-me-in-production` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token 有效期（分钟） | 1440 |
| `STORAGE_TYPE` | 存储类型：`local` | `local` |
| `STORAGE_LOCAL_PATH` | 本地存储目录 | `./storage` |
| `CORS_ORIGINS` | 允许的前端来源，JSON 数组 | `["http://localhost:3000"]` |
| `DASHSCOPE_API_KEY` | 阿里云百炼 API Key（AI 初审报告） | 空 |
| `LLM_BASE_URL` | 大模型接口地址 | 华北2 百炼兼容地址 |
| `LLM_MODEL` | 模型名 | `qwen3.5-plus` |

详见 `backend/.env.example`。前端可选配置见 `frontend/.env.example`（如生产直连后端时设置 `NEXT_PUBLIC_API_URL`）。

---

## 管理后台

- **入口**：仅 **admin** 角色可见顶栏「管理后台」及首页「系统入口」中的管理后台；或直接访问 `/admin`（非 admin 会跳转首页）。
- **功能**：
  - **仪表盘** `/admin`：稿件总数、待处理数、栏目/模板数、用户角色分布、状态看板、待处理稿件、最近注册用户、最近处理记录。
  - **稿件总览** `/admin/manuscripts`：按状态/栏目/关键词筛选，支持退修/录用/退稿，支持跳转查看详情。
  - **用户管理** `/admin/users`：列表（角色/状态筛选、分页）、新建用户、编辑（姓名/角色/启用）、删除用户（安全校验）。
  - **栏目管理** `/admin/sections`：列表、新增/编辑/删除栏目。
  - **退修模板** `/admin/templates`：列表、新增/编辑模板。
  - **系统配置** `/admin/config`：键值对配置的增删改保存。

详见 [docs/admin.md](docs/admin.md)。

---

## 项目结构（简要）

```
pku_law_review_platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # 路由：auth, manuscripts, editor, admin, ai
│   │   ├── core/             # 安全、依赖、配置
│   │   ├── db/               # 数据库与 Session
│   │   ├── models/          # ORM：User, Section, Manuscript, RevisionTemplate, SystemConfig 等
│   │   └── main.py
│   ├── scripts/
│   │   └── init_db.py       # 建表 + 可选种子编辑账号
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             # 页面：首页、登录/注册、投稿、作者中心、编辑工作台、管理后台
│   │   ├── components/      # HeaderBar, HomeSidebar, Footer 等
│   │   ├── contexts/       # AuthContext
│   │   ├── services/       # api.ts（auth, manuscripts, editor, admin, ai）
│   │   └── lib/            # 常量等
│   └── package.json
├── docs/                    # PRD、库表、API、技术栈、管理后台说明
└── README.md
```

---

## 开发与后续

- **开发顺序建议**：见 [docs/PRD-v0.1.md](docs/PRD-v0.1.md) 第九章；当前业务闭环与管理后台已打通，后续可接文档解析、知识库与报告内容增强。
- **生产部署**：详见 **[docs/deploy.md](docs/deploy.md)**（服务器环境、Nginx、systemd、HTTPS）。建议使用 PostgreSQL、独立 `SECRET_KEY`；前端 `npm run build` + `npm run start`，后端用 uvicorn 多 worker。

---

## 初版成功标准

- 作者可完成投稿并查看状态与退修意见、上传修订稿。
- 编辑可在工作台查看稿件与 AI 初审报告，并进行退修/退稿/录用操作。
- 管理员可管理用户、栏目、退修模板与系统配置。
- 全链路可跑通、可演示、可交付编辑部试用。
