"""
API v1 路由聚合。按 PRD/API 清单逐步挂载：auth、manuscripts、editor、admin、public 等。
"""
from fastapi import APIRouter

from app.api.v1 import admin, ai, auth, editor, jobs, manuscripts

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(manuscripts.router, prefix="/manuscripts", tags=["manuscripts"])
router.include_router(editor.router, prefix="/editor", tags=["editor"])
router.include_router(ai.router, prefix="/ai", tags=["ai"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
