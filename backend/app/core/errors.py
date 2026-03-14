"""
统一错误响应结构。
"""
from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


def _request_id(request: Request) -> str:
    return getattr(getattr(request, "state", None), "request_id", "") or ""


def error_payload(
    *,
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "success": False,
        "detail": message,
        "error": {
            "code": code,
            "message": message,
        },
        "path": request.url.path,
        "request_id": _request_id(request),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status_code": status_code,
    }
    if details is not None:
        payload["error"]["details"] = details
    return payload


def error_response(
    *,
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=error_payload(
            request=request,
            status_code=status_code,
            code=code,
            message=message,
            details=details,
        ),
    )
