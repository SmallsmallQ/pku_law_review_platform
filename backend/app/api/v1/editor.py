"""
编辑端：稿件列表、详情、操作（状态变更、退修、退稿、录用）。见 docs/api-spec.md。
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import RequireEditor, get_current_user, get_current_user_for_download
from app.core.storage import resolve_path
from app.db.base import get_db
from app.models import EditorAction, Manuscript, ManuscriptVersion, User, ManuscriptParsed, ReviewReport
from app.services.llm import chat_completion, is_llm_configured
from app.services.review_service import generate_full_ai_report

router = APIRouter()


def _assign_editor_action_id_for_sqlite(db: Session, action: EditorAction) -> None:
    """SQLite 下 BIGINT 主键不会自增，手动分配 editor_actions.id。"""
    if db.bind is not None and db.bind.dialect.name == "sqlite":
        action.id = (db.query(func.max(EditorAction.id)).scalar() or 0) + 1


class EditorManuscriptListItem(BaseModel):
    id: int
    manuscript_no: str
    title: str
    status: str
    submitted_by: int
    created_at: str
    current_version_id: int | None
    has_report: bool = False  # 后续有 report 表后填充

    class Config:
        from_attributes = True


class EditorActionBody(BaseModel):
    action_type: str  # status_change | revision_request | reject | accept
    to_status: str | None = None
    comment: str | None = None


@router.get("/manuscripts")
def editor_manuscript_list(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireEditor)],
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    keyword: str | None = None,
):
    """编辑稿件列表，支持按状态筛选。"""
    q = db.query(Manuscript)
    if status:
        q = q.filter(Manuscript.status == status)
    if keyword and keyword.strip():
        k = f"%{keyword.strip().lower()}%"
        q = q.filter(
            or_(
                func.lower(func.coalesce(Manuscript.title, "")).like(k),
                func.lower(func.coalesce(Manuscript.manuscript_no, "")).like(k),
            )
        )
    total = q.count()
    items = q.order_by(Manuscript.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    report_content, report_model = _normalize_report_payload(report_obj)

    return {
        "items": [
            EditorManuscriptListItem(
                id=m.id,
                manuscript_no=m.manuscript_no,
                title=m.title,
                status=m.status,
                submitted_by=m.submitted_by,
                created_at=m.created_at.isoformat() if m.created_at else "",
                current_version_id=m.current_version_id,
                has_report=False,
            )
            for m in items
        ],
        "total": total,
    }


@router.get("/manuscripts/{id}")
def editor_manuscript_detail(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireEditor)],
):
    """稿件详情（编辑驾驶舱）：主表、当前版本、解析结果占位、报告占位、编辑操作历史。"""
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    # 当前版本
    version = None
    if m.current_version_id:
        version = db.query(ManuscriptVersion).filter(ManuscriptVersion.id == m.current_version_id).first()
    # 解析结果
    parsed = None
    if m.current_version_id:
        parsed = db.query(ManuscriptParsed).filter(ManuscriptParsed.version_id == m.current_version_id).first()
    
    # 初审报告
    report_obj = None
    if m.current_version_id:
        report_obj = db.query(ReviewReport).filter(
            ReviewReport.version_id == m.current_version_id,
            ReviewReport.report_type == "preliminary"
        ).first()

    # 编辑操作历史
    actions = db.query(EditorAction).filter(EditorAction.manuscript_id == id).order_by(EditorAction.created_at.desc()).limit(50).all()
    
    return {
        "manuscript": {
            "id": m.id,
            "manuscript_no": m.manuscript_no,
            "title": m.title,
            "status": m.status,
            "submitted_by": m.submitted_by,
            "section_id": m.section_id,
            "current_version_id": m.current_version_id,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        },
        "current_version": {
            "id": version.id,
            "version_number": version.version_number,
            "file_path": version.file_path,
            "file_name_original": version.file_name_original,
            "word_count": version.word_count,
            "parsed_at": version.parsed_at.isoformat() if version.parsed_at else None,
            "created_at": version.created_at.isoformat() if version.created_at else None,
        } if version else None,
        "parsed": {
            "title": parsed.title,
            "abstract": parsed.abstract,
            "keywords": parsed.keywords,
            "body_structure": parsed.body_structure,
            "parsed_at": parsed.created_at.isoformat() if parsed.created_at else None,
        } if parsed else None,
        "report": {
            "content": report_content,
            "model": report_model,
            "generated_at": report_obj.generated_at.isoformat() if report_obj.generated_at else None,
        } if report_obj else None,
        "citation_issues": [],
        "similarity_results": [],
        "editor_actions": [
            {
                "id": a.id,
                "editor_id": a.editor_id,
                "action_type": a.action_type,
                "from_status": a.from_status,
                "to_status": a.to_status,
                "comment": a.comment,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in actions
        ],
    }


VALID_ACTION_TYPES = {"revision_request", "reject", "accept", "status_change"}


@router.post("/manuscripts/{id}/actions")
def editor_action(
    id: int,
    body: EditorActionBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireEditor)],
):
    """编辑操作：状态变更、退修、退稿、录用。写 editor_actions 并更新 manuscripts.status。"""
    if body.action_type not in VALID_ACTION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"action_type 须为 {sorted(VALID_ACTION_TYPES)} 之一",
        )
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    from_status = m.status
    to_status = body.to_status
    if body.action_type == "revision_request":
        to_status = "revision_requested"
    elif body.action_type == "reject":
        to_status = "rejected"
    elif body.action_type == "accept":
        to_status = "accepted"
    elif body.action_type == "status_change" and body.to_status:
        to_status = body.to_status
    else:
        to_status = to_status or from_status

    action = EditorAction(
        manuscript_id=id,
        editor_id=user.id,
        action_type=body.action_type,
        from_status=from_status,
        to_status=to_status,
        comment=body.comment,
    )
    _assign_editor_action_id_for_sqlite(db, action)
    db.add(action)
    m.status = to_status
    db.commit()
    return {"message": "ok", "new_status": to_status}


class AiReviewResponse(BaseModel):
    content: str
    model: str


def _normalize_report_payload(report_obj: ReviewReport | None) -> tuple[str, str]:
    """标准化报告内容，避免 JSON 结构异常导致响应序列化报错。"""
    if not report_obj:
        return "", settings.llm_model
    raw = report_obj.content
    if isinstance(raw, dict):
        content = raw.get("text", "")
        model = raw.get("model") or settings.llm_model
    else:
        content = raw
        model = settings.llm_model
    return str(content or ""), str(model or settings.llm_model)


@router.post("/manuscripts/{id}/ai-review", response_model=AiReviewResponse)
def editor_ai_review(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireEditor)],
):
    """生成该稿件的 AI 初审报告（基于标题与当前版本信息，调用大模型）。"""
    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="未配置大模型（请在 .env 中设置 DASHSCOPE_API_KEY）",
        )
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    if not m.current_version_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该稿件尚无文件版本")

    try:
        report = generate_full_ai_report(db, id, m.current_version_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"生成 AI 报告失败: {e!s}",
        )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="生成 AI 报告失败，请检查大模型配置或解析状态",
        )

    content, model = _normalize_report_payload(report)
    return AiReviewResponse(content=content, model=model)


@router.get("/manuscripts/{id}/files/{version_id}/download")
def editor_download_file(
    id: int,
    version_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user_for_download)],
):
    """编辑下载稿件某版本主稿文件。支持 Authorization 或 ?token= 鉴权；需为 editor/admin 角色。"""
    if user.role not in ("editor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    v = db.query(ManuscriptVersion).filter(ManuscriptVersion.id == version_id, ManuscriptVersion.manuscript_id == id).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="版本不存在")
    path = resolve_path(v.file_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文件不存在")
    return FileResponse(path, filename=v.file_name_original or "manuscript.pdf")
