"""
稿件相关：创建、我的列表、详情、版本、退修意见、修订稿上传、下载。见 docs/api-spec.md。
"""
import os
import re
import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, status, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_current_user_for_download
from app.core.storage import ALLOWED_EXTENSIONS, resolve_path, save_manuscript_file, save_supplement_file
from app.db.base import get_db
from app.models import EditorAction, Manuscript, ManuscriptAssignment, ManuscriptVersion, ManuscriptParsed, User
from app.services.parser import parse_manuscript
from app.services.review_service import process_manuscript_parsing
from app.schemas.manuscript import (
    AccessibleManuscriptListItem,
    ManuscriptCreateResponse,
    ManuscriptDetailResponse,
    ManuscriptListItem,
    ManuscriptVersionBrief,
    RevisionRequestItem,
)

router = APIRouter()
REVIEW_ACCESS_ROLES = {"internal_reviewer", "external_reviewer", "editor", "admin"}


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


def _assigned_manuscript_ids(db: Session, user: User) -> set[int]:
    if user.role not in REVIEW_ACCESS_ROLES:
        return set()
    rows = (
        db.query(ManuscriptAssignment.manuscript_id)
        .filter(ManuscriptAssignment.reviewer_id == user.id)
        .distinct()
        .all()
    )
    return {int(row[0]) for row in rows}


def _accessible_manuscripts_query(db: Session, user: User):
    q = db.query(Manuscript)
    if user.role == "admin":
        return q

    if user.role in REVIEW_ACCESS_ROLES:
        assignment_ids = (
            db.query(ManuscriptAssignment.manuscript_id)
            .filter(ManuscriptAssignment.reviewer_id == user.id)
            .distinct()
            .subquery()
        )
        return q.filter(
            or_(
                Manuscript.submitted_by == user.id,
                Manuscript.id.in_(assignment_ids),
            )
        )

    return q.filter(Manuscript.submitted_by == user.id)


def _can_access_manuscript(db: Session, user: User, manuscript: Manuscript) -> bool:
    if manuscript.submitted_by == user.id or user.role == "admin":
        return True
    if user.role not in REVIEW_ACCESS_ROLES:
        return False
    assignment = (
        db.query(ManuscriptAssignment.id)
        .filter(
            ManuscriptAssignment.manuscript_id == manuscript.id,
            ManuscriptAssignment.reviewer_id == user.id,
        )
        .first()
    )
    return assignment is not None


def _access_mode_for_manuscript(user: User, manuscript: Manuscript, assigned_ids: set[int]) -> str:
    authored = manuscript.submitted_by == user.id
    assigned = int(manuscript.id) in assigned_ids
    if authored and assigned:
        return "submitted_and_reviewing"
    if authored:
        return "submitted"
    if assigned:
        return "reviewing"
    return "admin"


def _clean_citation_text(text: str) -> str:
    value = re.sub(r"\s+", " ", (text or "").strip())
    value = re.sub(r"^\d+\s*[:：]\s*", "", value)
    return value.strip()


def _looks_like_citation(text: str) -> bool:
    value = text.strip()
    if len(value) < 8:
        return False

    patterns = [
        r"《[^》]+》",
        r"载《[^》]+》",
        r"\b\d{4}\b",
        r"第\d+页",
        r"\[[JMCDAPR]\]",
        r"\b(?:Journal|Review|Law|Press|University)\b",
        r"\bet al\.",
    ]
    return any(re.search(pattern, value, flags=re.I) for pattern in patterns)


def _extract_citations_from_text(body_text: str) -> list[str]:
    lines = [re.sub(r"\s+", " ", line).strip() for line in body_text.splitlines()]
    lines = [line for line in lines if line]
    if not lines:
        return []

    heading_pattern = re.compile(r"^(参考文献|参考书目|引用文献|references|bibliography)$", re.I)
    citations: list[str] = []
    collecting = False

    for line in lines:
        if heading_pattern.match(line):
            collecting = True
            continue
        if not collecting:
            continue
        if len(line) <= 3:
            continue
        citations.append(line)

    if citations:
        return citations

    return [line for line in lines if _looks_like_citation(line)]


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


@router.get("/accessible-for-ai-detect")
def accessible_manuscripts_for_ai_detect(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    page: int = 1,
    page_size: int = 100,
    keyword: str | None = None,
):
    """返回当前用户在 AI 检测页可导入的稿件：包括本人投稿、被分配审阅的稿件，以及管理员可访问稿件。"""
    q = _accessible_manuscripts_query(db, user)
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
    assigned_ids = _assigned_manuscript_ids(db, user)
    return {
        "items": [
            AccessibleManuscriptListItem(
                id=m.id,
                manuscript_no=m.manuscript_no,
                title=m.title,
                status=m.status,
                current_version_id=m.current_version_id,
                created_at=m.created_at,
                access_mode=_access_mode_for_manuscript(user, m, assigned_ids),
            )
            for m in items
        ],
        "total": total,
    }


# ---------- 上传 Word/PDF 提取正文（用于 AI 检测等，不落库） ----------
@router.post("/extract-text")
def extract_text_from_file(
    user: Annotated[User, Depends(get_current_user)],
    file: Annotated[UploadFile, File()],
):
    """上传单个 Word/PDF 文件，提取正文文本返回，用于 AI 检测页等。不存储文件。"""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请选择文件")
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in (".docx", ".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 .docx（Word）或 .pdf 格式",
        )
    content = file.file.read()
    suffix = ext
    fd = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        fd.write(content)
        fd.close()
        data = parse_manuscript(fd.name)
        text = (data.get("body_text") or "").strip()
        if not text and data.get("abstract"):
            text = (data.get("abstract") or "").strip()
        return {"text": text or ""}
    finally:
        if os.path.exists(fd.name):
            os.unlink(fd.name)


@router.post("/extract-citations")
def extract_citations_from_file(
    user: Annotated[User, Depends(get_current_user)],
    file: Annotated[UploadFile, File()],
):
    """上传 Word/PDF 文件，优先提取脚注或参考文献中的引注候选。"""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请选择文件")
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in (".docx", ".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 .docx（Word）或 .pdf 格式",
        )

    content = file.file.read()
    fd = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        fd.write(content)
        fd.close()
        data = parse_manuscript(fd.name)

        footnotes_raw = data.get("footnotes_raw") or []
        citations = [_clean_citation_text(str(item)) for item in footnotes_raw if _clean_citation_text(str(item))]
        source = "footnotes"

        if not citations:
            body_text = (data.get("body_text") or "").strip()
            citations = [_clean_citation_text(item) for item in _extract_citations_from_text(body_text)]
            source = "references" if citations else "body"

        return {
            "citations": citations,
            "source": source,
            "total": len(citations),
        }
    finally:
        if os.path.exists(fd.name):
            os.unlink(fd.name)


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


# ---------- 获取稿件正文（用于 AI 检测导入） ----------
@router.get("/{id}/text-for-ai-detect")
def manuscript_text_for_ai_detect(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    """返回当前用户有权限访问的稿件正文，供 AI 检测页导入。若该版本尚未解析则无正文。"""
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    if not _can_access_manuscript(db, user, m):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
    if not m.current_version_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该稿件暂无版本或未解析")
    parsed = db.query(ManuscriptParsed).filter(ManuscriptParsed.version_id == m.current_version_id).first()
    if not parsed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该版本尚未解析出正文，请稍后再试")
    text = (parsed.body_text or "").strip()
    if not text and parsed.abstract:
        text = (parsed.abstract or "").strip()
    return {"text": text or ""}


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
