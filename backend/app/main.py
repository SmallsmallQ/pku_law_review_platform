"""
中外法学智能编审系统 — FastAPI 入口。
"""
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1 import router as api_v1

logger = logging.getLogger("uvicorn.error")

# 启动时打日志，便于确认 revision-draft 的 502 友好错误处理已加载
logger.info("revision-draft: 异常将返回 502+detail 而非 500 Internal Server Error")


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


def _is_revision_draft_request(request: Request) -> bool:
    """判断是否为退修意见草稿接口（含代理/重写后的 path）。"""
    try:
        path = getattr(request, "url", None)
        path = path.path if path else getattr(request, "scope", {}).get("path", "") or ""
        return "revision-draft" in (path or "")
    except Exception:
        return False


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    # 对 revision-draft 接口统一返回 502 + 具体原因，避免前端只看到 Internal Server Error
    if _is_revision_draft_request(request):
        return JSONResponse(
            status_code=502,
            content={"detail": f"生成退修意见草稿时出错: {exc!s}"},
        )
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


@app.get("/health")
def health():
    """健康检查，供部署与网关使用。"""
    return {"status": "ok", "app": settings.app_name}
