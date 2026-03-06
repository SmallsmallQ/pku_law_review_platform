"""
稿件相关：创建、我的列表、详情、版本、退修意见、修订稿上传、下载。见 docs/api-spec.md。
"""
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, status, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_current_user_for_download
from app.core.storage import ALLOWED_EXTENSIONS, resolve_path, save_manuscript_file, save_supplement_file
from app.db.base import get_db
from app.models import EditorAction, Manuscript, ManuscriptVersion, User
from app.services.review_service import process_manuscript_parsing
from app.schemas.manuscript import (
    ManuscriptCreateResponse,
    ManuscriptDetailResponse,
    ManuscriptListItem,
    ManuscriptVersionBrief,
    RevisionRequestItem,
)

router = APIRouter()


def _assign_id_for_sqlite(db: Session, model, obj) -> None:
    """SQLite 下 BIGINT 主键不会自增，手动分配主键。"""
    if db.bind is not None and db.bind.dialect.name == "sqlite":
        obj.id = (db.query(func.max(model.id)).scalar() or 0) + 1


def _version_brief(v: ManuscriptVersion) -> ManuscriptVersionBrief:
    return ManuscriptVersionBrief(
        id=v.id,
        version_number=v.version_number,
        file_name_original=v.file_name_original,
        word_count=v.word_count,
        parsed_at=v.parsed_at,
        created_at=v.created_at,
    )


def _manuscript_detail(m: Manuscript, include_version: bool = True) -> ManuscriptDetailResponse:
    cv = m.current_version if include_version else None
    return ManuscriptDetailResponse(
        id=m.id,
        manuscript_no=m.manuscript_no,
        title=m.title,
        status=m.status,
        submitted_by=m.submitted_by,
        section_id=m.section_id,
        current_version_id=m.current_version_id,
        created_at=m.created_at,
        updated_at=m.updated_at,
        current_version=_version_brief(cv) if cv else None,
    )


# ---------- 创建稿件（multipart） ----------
@router.post("", response_model=ManuscriptCreateResponse)
def create_manuscript(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    title: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
    abstract: Annotated[str, Form()] = "",
    keywords: Annotated[str, Form()] = "",
    author_info: Annotated[str, Form()] = "{}",
    section_id: Annotated[int | None, Form()] = None,
    institution: Annotated[str, Form()] = "",
    fund: Annotated[str, Form()] = "",
    contact: Annotated[str, Form()] = "",
    submit: Annotated[str, Form()] = "false",
    supplement: Annotated[UploadFile | None, File()] = None,
    background_tasks: BackgroundTasks = None,
):
    """创建稿件并上传主稿（必填）与补充材料（可选）。submit=true 则状态为 submitted。"""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请上传稿件文件")
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"仅支持 {list(ALLOWED_EXTENSIONS)} 格式",
        )
    content = file.file.read()
    submit_yes = str(submit).strip().lower() in ("true", "1", "yes")
    status_val = "submitted" if submit_yes else "draft"

    manuscript = Manuscript(
        title=title,
        submitted_by=user.id,
        section_id=section_id,
        status=status_val,
        manuscript_no="",  # 下面用 id 生成
    )
    _assign_id_for_sqlite(db, Manuscript, manuscript)
    db.add(manuscript)
    db.flush()

    manuscript.manuscript_no = f"M{manuscript.id:06d}"
    version_number = 1
    try:
        file_path = save_manuscript_file(manuscript.id, version_number, file.filename or "main.docx", content)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    supplement_path = None
    if supplement and supplement.filename:
        supp_content = supplement.file.read()
        supplement_path = save_supplement_file(manuscript.id, version_number, supplement.filename, supp_content)

    version = ManuscriptVersion(
        manuscript_id=manuscript.id,
        version_number=version_number,
        file_path=file_path,
        file_name_original=file.filename,
        supplement_path=supplement_path,
    )
    _assign_id_for_sqlite(db, ManuscriptVersion, version)
    db.add(version)
    db.flush()
    manuscript.current_version_id = version.id
    db.commit()
    
    # 异步解析
    if background_tasks:
        background_tasks.add_task(process_manuscript_parsing, db, version.id)
    
    db.refresh(manuscript)
    db.refresh(version)
    return ManuscriptCreateResponse(
        manuscript=_manuscript_detail(manuscript),
        version=_version_brief(version),
    )


# ---------- 我的稿件列表 ----------
@router.get("/my")
def my_manuscripts(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    keyword: str | None = None,
):
    """我的稿件列表，分页；可选按 status 筛选。"""
    q = db.query(Manuscript).filter(Manuscript.submitted_by == user.id)
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
    return {
        "items": [ManuscriptListItem(id=m.id, manuscript_no=m.manuscript_no, title=m.title, status=m.status, current_version_id=m.current_version_id, created_at=m.created_at) for m in items],
        "total": total,
    }


# ---------- 稿件详情（作者视角） ----------
@router.get("/{id}", response_model=ManuscriptDetailResponse)
def manuscript_detail(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    """稿件详情，仅本人稿件。"""
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    if m.submitted_by != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
    return _manuscript_detail(m)


# ---------- 稿件版本列表 ----------
@router.get("/{id}/versions")
def manuscript_versions(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    """某稿件的版本列表，仅本人稿件。"""
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m or m.submitted_by != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    versions = db.query(ManuscriptVersion).filter(ManuscriptVersion.manuscript_id == id).order_by(ManuscriptVersion.version_number).all()
    return {"items": [_version_brief(v) for v in versions]}


# ---------- 退修意见列表 ----------
@router.get("/{id}/revision-requests")
def revision_requests(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    """退修意见列表（editor_actions 中 action_type=revision_request）。仅本人稿件。"""
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m or m.submitted_by != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    actions = db.query(EditorAction).filter(EditorAction.manuscript_id == id, EditorAction.action_type == "revision_request").order_by(EditorAction.created_at.desc()).all()
    return {"items": [RevisionRequestItem(id=a.id, action_type=a.action_type, comment=a.comment, created_at=a.created_at) for a in actions]}


# ---------- 上传修订稿 ----------
@router.post("/{id}/versions", response_model=ManuscriptVersionBrief)
def upload_revision(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    file: Annotated[UploadFile, File()],
    background_tasks: BackgroundTasks = None,
):
    """上传修订稿，仅当状态为 revision_requested 且为本人稿件。创建新版本并可将状态改为 revised_submitted。"""
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m or m.submitted_by != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    if m.status != "revision_requested":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前状态不允许上传修订稿")
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请上传文件")
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"仅支持 {list(ALLOWED_EXTENSIONS)} 格式")
    content = file.file.read()

    next_num = db.query(ManuscriptVersion).filter(ManuscriptVersion.manuscript_id == id).count() + 1
    try:
        file_path = save_manuscript_file(id, next_num, file.filename or "main.docx", content)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    version = ManuscriptVersion(
        manuscript_id=id,
        version_number=next_num,
        file_path=file_path,
        file_name_original=file.filename,
    )
    _assign_id_for_sqlite(db, ManuscriptVersion, version)
    db.add(version)
    db.flush()
    m.current_version_id = version.id
    m.status = "revised_submitted"
    db.commit()

    # 异步解析
    if background_tasks:
        background_tasks.add_task(process_manuscript_parsing, db, version.id)

    db.refresh(version)
    return _version_brief(version)


# ---------- 下载某版本文件（支持 Query token，便于前端 <a> 下载） ----------
@router.get("/{id}/files/{version_id}/download")
def download_file(
    id: int,
    version_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user_for_download)],
):
    """下载稿件某版本主稿文件，仅本人稿件。支持 Authorization 或 ?token= 鉴权。"""
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m or m.submitted_by != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    v = db.query(ManuscriptVersion).filter(ManuscriptVersion.id == version_id, ManuscriptVersion.manuscript_id == id).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="版本不存在")
    path = resolve_path(v.file_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文件不存在")
    return FileResponse(path, filename=v.file_name_original or "manuscript.pdf")
