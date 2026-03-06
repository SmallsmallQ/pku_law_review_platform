# 后端 — FastAPI

中外法学智能编审系统 API。技术选型见项目根目录 `docs/tech-stack.md`，API 清单见 `docs/api-spec.md`。

## 运行

```bash
# 建议使用虚拟环境
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env       # 并修改 DATABASE_URL、SECRET_KEY、DASHSCOPE_API_KEY 等

# 创建数据库表（首次或重置时）
python -m scripts.init_db

# 可选：创建一名编辑账号便于测试
SEED_EDITOR_EMAIL=editor@test.com SEED_EDITOR_PASSWORD=yourpass python -m scripts.init_db

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- 健康检查：<http://localhost:8000/health>
- API 文档：<http://localhost:8000/docs>

## 目录说明

- `app/main.py` — 入口、CORS、路由挂载
- `app/config.py` — 配置（环境变量）
- `app/core/` — 认证、安全等
- `app/api/v1/` — 按模块拆分的路由（auth、manuscripts、editor、admin 等）

数据库迁移与模型后续按 `docs/database-schema.md` 用 SQLAlchemy + Alembic 接入。

## 阿里云百炼（大模型）

AI 初审报告、智能问答等依赖阿里云百炼（OpenAI 兼容接口）。在 `.env` 中配置：

- `DASHSCOPE_API_KEY`：百炼控制台创建的 API Key（必填后 AI 能力才可用）
- `LLM_BASE_URL`：默认北京地域，可选新加坡等（见 .env.example）
- `LLM_MODEL`：如 `qwen3.5-plus`、`qwen3-max-2026-01-23`、`qwen3-coder-next`

配置完成后，编辑可在「编辑工作台」使用 AI 对话；后续可接入稿件初审报告生成。
