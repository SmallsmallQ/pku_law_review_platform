"""
中外法学智能编审系统 — FastAPI 入口。
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1 import router as api_v1


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.init_db_on_startup:
        from app.db.base import init_db
        init_db()
    yield


app = FastAPI(
    lifespan=lifespan,
    title=settings.app_name,
    description="投稿管理 + AI 辅助初审 API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1, prefix="/api/v1", tags=["v1"])


@app.get("/health")
def health():
    """健康检查，供部署与网关使用。"""
    return {"status": "ok", "app": settings.app_name}
