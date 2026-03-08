"""
编辑端：稿件列表、详情、操作（状态变更、退修、退稿、录用）。见 docs/api-spec.md。
"""
import json
import logging
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import RequireEditor, get_current_user, get_current_user_for_download
from app.core.storage import resolve_path
from app.db.base import get_db
from app.models import CitationIssue, EditorAction, Manuscript, ManuscriptVersion, User, ManuscriptParsed, ReviewReport, RevisionTemplate
from app.services.citation_checker import check_citations_with_llm
from app.services.llm import chat_completion, is_llm_configured
from app.services.review_service import generate_full_ai_report

logger = logging.getLogger(__name__)
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

    # 引注检查报告（用于展示 citation_issues）
    citation_report = None
    if m.current_version_id:
        citation_report = db.query(ReviewReport).filter(
            ReviewReport.version_id == m.current_version_id,
            ReviewReport.report_type == "citation"
        ).first()

    # 编辑操作历史
    actions = db.query(EditorAction).filter(EditorAction.manuscript_id == id).order_by(EditorAction.created_at.desc()).limit(50).all()
    report_content, report_model = _normalize_report_payload(report_obj)

    citation_issues_list = []
    if citation_report:
        for ci in citation_report.citation_issues or []:
            citation_issues_list.append({
                "location": ci.location or "",
                "issue_type": ci.issue_type or "",
                "description": ci.description or "",
                "suggestion": ci.suggestion or "",
                "severity": ci.severity or "warning",
            })
    
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
        "citation_issues": citation_issues_list,
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


class CitationCheckBody(BaseModel):
    use_llm: bool = False


class CitationCheckResponse(BaseModel):
    total: int
    issues: list[dict]


def _normalize_report_payload(report_obj: ReviewReport | None) -> tuple[str, str]:
    """标准化报告内容，避免 JSON 结构异常导致响应序列化报错；绝不抛异常。"""
    try:
        if not report_obj:
            return "", settings.llm_model
        raw = getattr(report_obj, "content", None)
        if raw is None:
            return "", settings.llm_model
        if isinstance(raw, dict):
            content = raw.get("text", "")
            model = raw.get("model") or settings.llm_model
        elif isinstance(raw, str):
            try:
                data = json.loads(raw)
                content = data.get("text", "") if isinstance(data, dict) else raw
                model = data.get("model", settings.llm_model) if isinstance(data, dict) else settings.llm_model
            except (TypeError, ValueError):
                content = raw
                model = settings.llm_model
        else:
            content = str(raw)
            model = settings.llm_model
        return str(content or ""), str(model or settings.llm_model)
    except Exception:
        return "", settings.llm_model


@router.post("/manuscripts/{id}/citation-check", response_model=CitationCheckResponse)
def editor_citation_check(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireEditor)],
    body: CitationCheckBody | None = Body(None),
):
    """对当前版本脚注执行引注规范检查，结果写入引注检查报告并返回。body.use_llm=true 时接入大模型辅助判断。"""
    use_llm = body is not None and body.use_llm
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    if not m.current_version_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该稿件尚无文件版本")
    parsed = db.query(ManuscriptParsed).filter(ManuscriptParsed.version_id == m.current_version_id).first()
    if not parsed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请先等待稿件解析完成后再进行引注检查")
    footnotes_raw = parsed.footnotes_raw or []
    if not footnotes_raw:
        return CitationCheckResponse(total=0, issues=[])

    issues = check_citations_with_llm(footnotes_raw, use_llm=use_llm)
    issues_payload = [
        {"location": i.location, "issue_type": i.issue_type, "description": i.description, "suggestion": i.suggestion or "", "severity": i.severity}
        for i in issues
    ]

    report = db.query(ReviewReport).filter(
        ReviewReport.manuscript_id == id,
        ReviewReport.version_id == m.current_version_id,
        ReviewReport.report_type == "citation",
    ).first()
    if not report:
        report = ReviewReport(
            manuscript_id=id,
            version_id=m.current_version_id,
            report_type="citation",
            content={"source": "citation_check", "total_issues": len(issues)},
        )
        db.add(report)
        db.flush()
    else:
        report.content = {"source": "citation_check", "total_issues": len(issues)}
        report.generated_at = datetime.now()
        for existing in list(report.citation_issues):
            db.delete(existing)
        db.flush()

    for i in issues:
        ci = CitationIssue(
            report_id=report.id,
            location=i.location,
            issue_type=i.issue_type,
            description=i.description,
            suggestion=i.suggestion or "",
            severity=i.severity or "warning",
        )
        db.add(ci)
    db.commit()
    return CitationCheckResponse(total=len(issues), issues=issues_payload)


@router.post("/manuscripts/{id}/ai-review", response_model=AiReviewResponse)
def editor_ai_review(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireEditor)],
):
    """生成该稿件的 AI 初审报告（基于标题与当前版本信息，调用大模型）。"""
    try:
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

        report = generate_full_ai_report(db, id, m.current_version_id)

        if not report:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="生成 AI 报告失败（可能原因：稿件文件不存在、解析失败或大模型调用失败，请检查 .env 配置与稿件文件）",
            )

        content, model = _normalize_report_payload(report)
        return AiReviewResponse(content=content, model=model)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"生成 AI 报告失败: {e!s}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"生成 AI 报告失败: {e!s}",
        )


class AiChatBody(BaseModel):
    message: str


class AiChatResponse(BaseModel):
    content: str
    model: str


def _build_manuscript_context(db: Session, manuscript_id: int) -> str:
    """拼当前稿件上下文（标题、摘要、关键词、报告摘要），供 AI 对话使用。"""
    m = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not m:
        return ""
    parts = [f"稿件编号：{m.manuscript_no}", f"标题：{m.title or '（无）'}"]
    if m.current_version_id:
        parsed = db.query(ManuscriptParsed).filter(ManuscriptParsed.version_id == m.current_version_id).first()
        if parsed:
            parts.append(f"摘要：{(parsed.abstract or '（未识别）')[:800]}")
            parts.append(f"关键词：{(parsed.keywords or '（未识别）')[:300]}")
        report_obj = db.query(ReviewReport).filter(
            ReviewReport.manuscript_id == manuscript_id,
            ReviewReport.version_id == m.current_version_id,
            ReviewReport.report_type == "preliminary",
        ).first()
        if report_obj and report_obj.content:
            raw = report_obj.content
            text = (raw.get("text", "") if isinstance(raw, dict) else raw) or ""
            if text:
                parts.append(f"初审报告摘要（前 1200 字）：{text[:1200]}")
    return "\n\n".join(parts)


@router.post("/manuscripts/{id}/ai-chat", response_model=AiChatResponse)
def editor_ai_chat(
    id: int,
    body: AiChatBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireEditor)],
):
    """编辑端：基于当前稿件的智能对话。后端注入稿件上下文后调用大模型。"""
    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="未配置大模型（请在 .env 中设置 DASHSCOPE_API_KEY）",
        )
    m = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    context = _build_manuscript_context(db, id)
    if not context.strip():
        context = f"稿件编号：{m.manuscript_no}，标题：{m.title or '（无）'}"
    system_prompt = "你是法学期刊编辑助手。当前对话围绕以下稿件信息，请基于提供的内容专业、简洁地回答编辑的问题。"
    user_content = f"【当前稿件信息】\n\n{context}\n\n【编辑的问题】\n{body.message.strip()}"
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]
    try:
        content = chat_completion(messages, max_tokens=2048)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    return AiChatResponse(content=content, model=settings.llm_model)


class RevisionDraftResponse(BaseModel):
    draft: str


def _get_revision_templates_safe(db: Session):
    """安全获取退修模板列表，表不存在或查询异常时返回空列表。"""
    try:
        return db.query(RevisionTemplate).filter(RevisionTemplate.is_active.is_(True)).order_by(RevisionTemplate.id).all()
    except Exception as e:
        logger.warning("获取退修模板失败，将使用空模板: %s", e)
        return []


@router.post("/manuscripts/{id}/revision-draft", response_model=RevisionDraftResponse)
def editor_revision_draft(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireEditor)],
):
    """编辑端：根据当前稿件 AI 初审报告与退修模板，生成退修意见草稿。"""
    draft = ""
    try:
        if not is_llm_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="未配置大模型（请在 .env 中设置 DASHSCOPE_API_KEY）",
            )
        m = db.query(Manuscript).filter(Manuscript.id == id).first()
        if not m:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
        if not m.current_version_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该稿件尚无版本，无法生成退修意见")
        report_obj = db.query(ReviewReport).filter(
            ReviewReport.manuscript_id == id,
            ReviewReport.version_id == m.current_version_id,
            ReviewReport.report_type == "preliminary",
        ).first()
        report_text, _ = _normalize_report_payload(report_obj)
        templates = _get_revision_templates_safe(db)
        template_block = "\n\n".join(
            f"【{t.name or '模板'}】\n{str(t.content or '')}" for t in templates
        ) if templates else "（暂无退修模板，请管理员在后台配置）"
        prompt_instruction = """请根据以下「初审报告」和「本刊退修模板要求」，生成一段给作者的退修意见草稿。
要求：简洁、专业、直接面向作者；条理清晰；可分点列出主要修改方向；不要简单复述报告全文。"""
        user_content = f"""## 初审报告\n{report_text[:8000] if report_text else '（暂无初审报告，请先生成 AI 初审报告）'}\n\n## 本刊退修模板（可参考）\n{template_block}\n\n请直接输出退修意见正文，不要加「草稿」等前缀。"""
        messages = [
            {"role": "system", "content": prompt_instruction},
            {"role": "user", "content": user_content},
        ]
        # 使用 55 秒超时，避免代理/网关先断开导致 500，超时则返回 502 明确提示
        draft = chat_completion(messages, max_tokens=1500, timeout=55)
        draft = (draft or "").strip()
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except BaseException as e:
        logger.exception("生成退修意见草稿异常 manuscript_id=%s: %s", id, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"生成退修意见草稿时出错: {e!s}",
        )
    return RevisionDraftResponse(draft=draft)


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
