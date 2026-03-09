"""
通用依赖：DB Session、当前用户、角色校验。
"""
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.core.review_workflow import VALID_USER_ROLES
from app.db.base import get_db
from app.models import User


def get_current_user_optional(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User | None:
    """可选认证：有有效 token 则返回用户，否则返回 None。"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    user_id = payload.get("sub")
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    return user


def get_current_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    """必须认证：未登录则 401。"""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录或登录已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(*roles: str):
    """依赖工厂：要求当前用户角色在 roles 内，否则 403。"""

    def _check(
        user: User = Depends(get_current_user),
    ) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限",
            )
        return user

    return _check


# 常用角色依赖
RequireReviewStaff = require_roles("internal_reviewer", "external_reviewer", "editor", "admin")
RequireEditor = require_roles("editor", "admin")
RequireAdmin = require_roles("admin")


def get_current_user_optional_from_token(
    authorization: Annotated[str | None, Header()] = None,
    token: Annotated[str | None, Query()] = None,
    db: Session = Depends(get_db),
) -> User | None:
    """可选认证：优先 Header Bearer，其次 Query token（用于下载链接等无法带 Header 的场景）。"""
    raw = None
    if authorization and authorization.startswith("Bearer "):
        raw = authorization.replace("Bearer ", "").strip()
    elif token:
        raw = token
    if not raw:
        return None
    payload = decode_access_token(raw)
    if not payload or "sub" not in payload:
        return None
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        return None
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    return user


def get_current_user_for_download(
    user: User | None = Depends(get_current_user_optional_from_token),
) -> User:
    """下载接口用：支持 Header 或 Query token，未登录则 401。"""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录或登录已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
