"""
编辑端：稿件列表、详情、操作（状态变更、退修、退稿、录用）。见 docs/api-spec.md。
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import RequireEditor, get_current_user, get_current_user_for_download
from app.core.storage import resolve_path
from app.db.base import get_db
from app.models import EditorAction, Manuscript, ManuscriptVersion, User
from app.services.llm import chat_completion, is_llm_configured

router = APIRouter()


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
):
    """编辑稿件列表，支持按状态筛选。"""
    q = db.query(Manuscript)
    if status:
        q = q.filter(Manuscript.status == status)
    total = q.count()
    items = q.order_by(Manuscript.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
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
        "parsed": None,  # 解析结果后续接入 manuscript_parsed
        "report": None,  # 初审报告后续接入 review_reports
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
    db.add(action)
    m.status = to_status
    db.commit()
    return {"message": "ok", "new_status": to_status}


class AiReviewResponse(BaseModel):
    content: str
    model: str


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
    version = None
    if m.current_version_id:
        version = db.query(ManuscriptVersion).filter(
            ManuscriptVersion.id == m.current_version_id,
            ManuscriptVersion.manuscript_id == id,
        ).first()

    # 构建审稿提示：目前仅有标题与版本信息，后续可接入解析后的摘要、正文片段
    title = m.title or "（无标题）"
    file_name = version.file_name_original if version else "（无文件）"
    word_count = f"{version.word_count} 字" if version and version.word_count else "（未统计）"
    manuscript_info = f"""稿件编号：{m.manuscript_no}
标题：{title}
当前版本文件名：{file_name}
字数：{word_count}"""

    system_prompt = """你是法学期刊初审专家。请根据提供的稿件信息，给出简明、结构化的初审意见，供责任编辑参考。意见应客观、专业，并符合学术规范。若信息有限，可基于标题与形式信息给出初步判断与建议。"""
    user_prompt = f"""请对以下稿件给出初审意见，按以下维度组织（每项简明扼要）：

1. **总体印象**：选题与刊物匹配度、是否值得进一步审阅。
2. **形式规范建议**：标题、摘要、关键词、格式等可改进之处。
3. **引注与写作规范**：引注格式、学术写作规范方面的建议。
4. **具体修改建议**：可操作的 2～5 条修改建议。

稿件信息：
{manuscript_info}

请直接输出初审意见正文，使用 Markdown 格式。"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    try:
        content = chat_completion(messages, max_tokens=2048)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"大模型调用失败：{e!s}",
        )
    return AiReviewResponse(content=content, model=settings.llm_model)


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
