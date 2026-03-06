# 中外法学智能编审系统（Law Journal Intelligent Editorial System）

面向法学期刊编辑部的**投稿管理 + AI 辅助初审**平台。初版（v0.1）聚焦：作者规范投稿 → 系统自动解析 → 生成 AI 初审报告 → 编辑查看并决定退修/继续/退稿。

## 项目状态

- **当前阶段**：业务闭环已打通，可本地跑通「注册 → 登录 → 投稿 → 编辑处理（退修/退稿/录用）」与「作者查看退修意见、上传修订稿」。
- **已实现**：用户与权限（作者/编辑）、稿件 CRUD、文件上传与下载、编辑工作台与操作记录；前端 Ant Design 统一 UI、登录/注册、投稿表单（含版权转让协议勾选）、作者中心、编辑工作台及详情与操作、退修/退稿/录用、AI 初审报告生成入口；版权转让协议独立页、404 页、全局页脚。
- **待接**：文档解析、知识库入库、AI 报告内容与知识库检索（见 PRD 开发顺序第 3–5 步）。

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/PRD-v0.1.md](docs/PRD-v0.1.md) | 初版产品需求说明：定位、角色、流程、功能边界、页面、AI 报告结构、知识库与开发顺序 |
| [docs/database-schema.md](docs/database-schema.md) | 数据库表设计：用户、稿件与版本、解析结果、审稿报告、引注/相似/操作表、知识库切块与向量 |
| [docs/api-spec.md](docs/api-spec.md) | API 清单：认证、作者端、编辑端、后台任务、公开页、管理员端及实现优先级 |
| [docs/tech-stack.md](docs/tech-stack.md) | 技术选型说明：Next.js + FastAPI 组合理由与初版锁定栈 |

## 技术选型（初版，已锁定）

- **前端**：Next.js（App Router）+ TypeScript + Tailwind CSS + **Ant Design 5**
- **后端**：FastAPI + PostgreSQL（pgvector 做向量）
- **文件存储**：MinIO / OSS（或初版本地目录）
- **认证**：JWT，初版简单稳定
- **任务**：初版轻量，后续再加异步队列

## 本地运行

```bash
# 1. 后端：建库并配置 backend/.env（SECRET_KEY 等，见 backend/.env.example）
cd backend
pip install -r requirements.txt
# 未安装/未启动 PostgreSQL 时：在 .env 中设置 USE_SQLITE=true，或留空 DATABASE_URL（默认 SQLite）
python -m scripts.init_db
# 可选：创建编辑账号 SEED_EDITOR_EMAIL=editor@test.com SEED_EDITOR_PASSWORD=xxx python -m scripts.init_db
uvicorn app.main:app --reload --port 8000

# 2. 前端（另开终端）
cd frontend && npm install && npm run dev
```

- 前端：<http://localhost:3000>（首页、登录/注册、投稿、作者中心、编辑工作台、版权转让协议、404）
- 后端：<http://localhost:8000/docs>（OpenAPI）、<http://localhost:8000/health>
- 测试：先注册作者账号投稿；在数据库中将该用户 `role` 改为 `editor`，或使用 `SEED_EDITOR_EMAIL` / `SEED_EDITOR_PASSWORD` 创建编辑账号，登录后进入编辑工作台处理稿件（退修/退稿/录用、生成 AI 初审报告）。

## 开发顺序建议

1. 产品原型与数据结构（已由 PRD + 库表 + API 覆盖）
2. 后端基础骨架（用户认证、稿件 CRUD、状态与文件存储）
3. 文档解析链路
4. 知识库入库与相似度检索
5. AI 初审报告生成
6. 编辑工作台与稿件详情页打通
7. 管理员配置与增强

## 初版成功标准

- 作者可完成投稿并查看状态与退修意见、上传修订稿
- 稿件能自动解析，系统能生成一份结构化初审报告
- 编辑能在后台查看报告并对稿件进行状态与退修操作
- 全链路可跑通、可演示、可交付编辑部试用
