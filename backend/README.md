# 后端 — FastAPI

中外法学智能编审系统 API。技术选型见项目根目录 `docs/tech-stack.md`，API 清单见 `docs/api-spec.md`。

## 运行

```bash
# 建议使用虚拟环境
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env       # 并修改 DATABASE_URL、SECRET_KEY、DASHSCOPE_API_KEY 等

# 开发环境初始化数据库（SQLite/本地调试）
python -m scripts.init_db

# 可选：创建一名编辑账号便于测试
SEED_EDITOR_EMAIL=editor@test.com SEED_EDITOR_PASSWORD=yourpass python -m scripts.init_db

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- 健康检查：<http://localhost:8000/health>
- Liveness：<http://localhost:8000/health/live>
- Readiness：<http://localhost:8000/health/ready>
- API 文档：<http://localhost:8000/docs>

## 目录说明

- `app/main.py` — 入口、CORS、路由挂载
- `app/config.py` — 配置（环境变量）
- `app/core/` — 认证、安全等
- `app/api/v1/` — 按模块拆分的路由（auth、manuscripts、editor、admin 等）

## 生产部署建议

生产实例参考：

- 域名：`aliyun`
- 服务器：`aliyun`
- 仓库：`https://github.com/SmallsmallQ/pku_law_review_platform`

### 1. PostgreSQL

生产环境必须配置：

- `ENVIRONMENT=production`
- `DATABASE_URL=postgresql://...`
- `SECRET_KEY=...`

生产环境会拒绝：

- SQLite fallback
- 默认 `SECRET_KEY`
- `INIT_DB_ON_STARTUP=true`

### 2. Alembic 迁移

首次部署或升级时使用：

```bash
alembic upgrade head
```

生成新迁移：

```bash
alembic revision --autogenerate -m "describe change"
```

### 3. 对象存储

默认使用本地目录。若部署到多实例/容器环境，建议改为 `STORAGE_TYPE=minio` 或 `STORAGE_TYPE=s3`，并配置：

- `STORAGE_BUCKET`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_ENDPOINT`（MinIO 必填，S3 可选）

### 4. 慢任务

当前慢任务已经拆成数据库持久化 job + 独立 worker：

- 稿件解析
- AI 初审报告
- 退修意见草稿
- Word 预览 PDF 生成

本地可直接启动 worker：

```bash
python -m scripts.job_worker
```

生产容器编排样板见项目根目录 `docker-compose.prod.yml`。

### 5. 异步任务接口

可通过以下接口入队，再轮询 `GET /api/v1/jobs/{job_id}`：

- `POST /api/v1/editor/manuscripts/{id}/ai-review/jobs`
- `POST /api/v1/editor/manuscripts/{id}/revision-draft/jobs`
- `POST /api/v1/editor/manuscripts/{id}/files/{version_id}/preview-pdf/jobs`

### 6. 已部署旧版本时更新后端

```bash
# 进入项目目录
cd /opt/pku_law_review_platform || cd /srv/pku_law_review_platform

# 拉取代码
git fetch --all
git checkout main
git pull --rebase origin main

# 更新后端依赖 + 数据迁移
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# 重启后端服务
sudo systemctl restart law-review-api
sudo systemctl status law-review-api --no-pager

# 健康检查
curl -I http://127.0.0.1:8000/health
```

## 阿里云百炼（大模型）

AI 初审报告、智能问答等依赖阿里云百炼（OpenAI 兼容接口）。在 `.env` 中配置：

- `DASHSCOPE_API_KEY`：百炼控制台创建的 API Key（必填后 AI 能力才可用）
- `LLM_BASE_URL`：默认北京地域，可选新加坡等（见 .env.example）
- `LLM_MODEL`：如 `qwen3.5-plus`、`qwen3-max-2026-01-23`、`qwen3-coder-next`

配置完成后，编辑可在「编辑工作台」使用 AI 对话；后续可接入稿件初审报告生成。
