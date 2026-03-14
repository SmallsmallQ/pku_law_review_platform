"""
中外法学智能编审系统 — FastAPI 入口。
"""
from contextlib import asynccontextmanager
import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import router as api_v1
from app.config import settings
from app.core.errors import error_response
from app.core.logging import configure_logging
from app.core.storage import storage_healthcheck
from app.db.base import db_healthcheck, init_db

configure_logging(settings.debug)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.init_db_on_startup:
        init_db()
    logger.info("应用启动完成 environment=%s", settings.environment)
    yield


app = FastAPI(
    lifespan=lifespan,
    title=settings.app_name,
    description="投稿管理 + AI 辅助初审 API",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1, prefix="/api/v1", tags=["v1"])


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    logger.info(
        "request_complete method=%s path=%s status=%s request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        request_id,
    )
    return response


def _is_editor_ai_request(request: Request) -> bool:
    path = request.url.path or ""
    return any(
        marker in path
        for marker in (
            "/ai-review",
            "/revision-draft",
            "/ai-chat",
        )
    )


def _http_error_message(detail) -> str:
    if isinstance(detail, str):
        if detail == "Not Found":
            return "资源不存在"
        if detail == "Method Not Allowed":
            return "请求方法不被允许"
        return detail
    if isinstance(detail, dict):
        return str(detail.get("message") or detail.get("detail") or "请求失败")
    return "请求失败"


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return error_response(
        request=request,
        status_code=exc.status_code,
        code=f"http_{exc.status_code}",
        message=_http_error_message(exc.detail),
        details=exc.detail if not isinstance(exc.detail, str) else None,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return error_response(
        request=request,
        status_code=422,
        code="validation_error",
        message="请求参数校验失败",
        details=exc.errors(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    status_code = 502 if _is_editor_ai_request(request) else 500
    message = f"AI 接口执行出错: {exc!s}" if status_code == 502 else "服务器内部错误"
    return error_response(
        request=request,
        status_code=status_code,
        code="ai_upstream_error" if status_code == 502 else "internal_server_error",
        message=message,
    )


@app.get("/health")
def health():
    """兼容旧探针。"""
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
    }


@app.get("/health/live")
def health_live():
    return {
        "status": "ok",
        "checks": {
            "app": True,
        },
    }


@app.get("/health/ready")
def health_ready():
    db_ok = db_healthcheck()
    storage_ok = storage_healthcheck()
    overall_ok = db_ok and storage_ok
    status_code = 200 if overall_ok else 503
    payload = {
        "status": "ok" if overall_ok else "degraded",
        "checks": {
            "database": db_ok,
            "storage": storage_ok,
        },
        "environment": settings.environment,
    }
    return JSONResponse(status_code=status_code, content=payload)
