"""
编辑端：稿件列表、详情、操作（状态变更、退修、退稿、录用）。见 docs/api-spec.md。
"""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import RequireReviewStaff, get_current_user_for_download
from app.core.review_workflow import REVIEW_STAGES, TERMINAL_STATUSES, next_flow_for_action, status_for_stage
from app.core.storage import resolve_path
from app.db.base import get_db
from app.models import CitationIssue, EditorAction, Manuscript, ManuscriptAssignment, ManuscriptVersion, ReviewSubmission, User, ManuscriptParsed, ReviewReport
from app.schemas.job import BackgroundJobResponse, EnqueueJobResponse
from app.services.citation_checker import check_citations_with_llm
from app.services.job_queue import (
    enqueue_ai_review_job,
    enqueue_preview_pdf_job,
    enqueue_revision_draft_job,
    run_job,
    serialize_job,
)
from app.services.llm import chat_completion, is_llm_configured
from app.services.preview_service import get_cached_preview_path, prepare_pdf_preview
from app.services.revision_service import generate_revision_draft
from app.services.review_service import generate_full_ai_report

logger = logging.getLogger(__name__)
router = APIRouter()


def _assign_sqlite_id(db: Session, model, obj) -> None:
    """SQLite 下 BIGINT 主键不会自增，手动分配主键。"""
    if db.bind is not None and db.bind.dialect.name == "sqlite":
        obj.id = (db.query(func.max(model.id)).scalar() or 0) + 1


def _stage_order(stage: str) -> int:
    try:
        return REVIEW_STAGES.index(stage)
    except ValueError:
        return len(REVIEW_STAGES)


def _serialize_assignments(db: Session, manuscript_ids: list[int]) -> dict[int, list[dict]]:
    if not manuscript_ids:
        return {}
    rows = (
        db.query(ManuscriptAssignment, User)
        .join(User, User.id == ManuscriptAssignment.reviewer_id)
        .filter(ManuscriptAssignment.manuscript_id.in_(manuscript_ids))
        .all()
    )
    data: dict[int, list[dict]] = {mid: [] for mid in manuscript_ids}
    for assignment, reviewer in rows:
        data.setdefault(assignment.manuscript_id, []).append(
            {
                "id": assignment.id,
                "review_stage": assignment.review_stage,
                "reviewer_id": assignment.reviewer_id,
                "reviewer_name": reviewer.real_name or reviewer.email,
                "reviewer_email": reviewer.email,
                "reviewer_role": reviewer.role,
                "note": assignment.note,
                "assigned_by": assignment.assigned_by,
                "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
                "updated_at": assignment.updated_at.isoformat() if assignment.updated_at else None,
            }
        )
    for items in data.values():
        items.sort(key=lambda item: _stage_order(str(item.get("review_stage", ""))))
    return data


def _serialize_actions(db: Session, manuscript_id: int) -> list[dict]:
    actions = db.query(EditorAction).filter(EditorAction.manuscript_id == manuscript_id).order_by(EditorAction.created_at.desc()).limit(50).all()
    if not actions:
        return []
    user_ids = sorted({int(a.editor_id) for a in actions if a.editor_id is not None})
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {u.id: u for u in users}
    return [
        {
            "id": a.id,
            "editor_id": a.editor_id,
            "operator_name": (user_map.get(a.editor_id).real_name or user_map.get(a.editor_id).email) if user_map.get(a.editor_id) else f"用户 {a.editor_id}",
            "operator_email": user_map.get(a.editor_id).email if user_map.get(a.editor_id) else None,
            "operator_role": user_map.get(a.editor_id).role if user_map.get(a.editor_id) else None,
            "action_type": a.action_type,
            "from_status": a.from_status,
            "to_status": a.to_status,
            "comment": a.comment,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in actions
    ]


def _serialize_review_submissions(db: Session, manuscript_id: int) -> list[dict]:
    submissions = (
        db.query(ReviewSubmission, User)
        .join(User, User.id == ReviewSubmission.reviewer_id)
        .filter(ReviewSubmission.manuscript_id == manuscript_id)
        .order_by(ReviewSubmission.updated_at.desc(), ReviewSubmission.id.desc())
        .all()
    )
    return [
        {
            "id": submission.id,
            "review_stage": submission.review_stage,
            "reviewer_id": submission.reviewer_id,
            "reviewer_name": reviewer.real_name or reviewer.email,
            "reviewer_email": reviewer.email,
            "reviewer_role": reviewer.role,
            "recommendation": submission.recommendation,
            "overall_score": submission.overall_score,
            "originality_score": submission.originality_score,
            "rigor_score": submission.rigor_score,
            "writing_score": submission.writing_score,
            "summary": submission.summary,
            "major_issues": submission.major_issues,
            "revision_requirements": submission.revision_requirements,
            "confidential_notes": submission.confidential_notes,
            "created_at": submission.created_at.isoformat() if submission.created_at else None,
            "updated_at": submission.updated_at.isoformat() if submission.updated_at else None,
        }
        for submission, reviewer in submissions
    ]


def _get_manuscript_or_404(db: Session, manuscript_id: int) -> Manuscript:
    manuscript = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="稿件不存在")
    return manuscript


def _can_access_manuscript(user: User, manuscript: Manuscript, assignments: list[dict]) -> bool:
    if user.role == "admin":
        return True
    return any(int(item.get("reviewer_id", 0)) == user.id for item in assignments)


def _available_actions_for_user(user: User, manuscript: Manuscript, assignments: list[dict]) -> list[str]:
    if manuscript.status in TERMINAL_STATUSES or manuscript.status == "revision_requested":
        return []

    current_stage = manuscript.current_review_stage
    stage_action_map = {
        "internal": "submit_internal_review",
        "external": "submit_external_review",
        "final": "submit_final_submission",
    }

    if user.role == "admin":
        actions = ["revision_request", "reject", "status_change", "accept"]
        stage_action = stage_action_map.get(current_stage or "")
        if stage_action:
            actions.append(stage_action)
        return actions

    if not current_stage:
        return []

    matched = next(
        (
            item for item in assignments
            if int(item.get("reviewer_id", 0)) == user.id and str(item.get("review_stage", "")) == current_stage
        ),
        None,
    )
    if not matched:
        return []

    actions = ["revision_request", "reject"]
    stage_action = stage_action_map.get(current_stage)
    if stage_action:
        actions.append(stage_action)
    if user.role in ("editor",) and current_stage == "final":
        actions.append("accept")
    return actions


def _is_assigned_to_stage(user: User, assignments: list[dict], review_stage: str | None) -> bool:
    if user.role == "admin":
        return True
    if not review_stage:
        return False
    return any(int(item.get("reviewer_id", 0)) == user.id and str(item.get("review_stage", "")) == review_stage for item in assignments)


def _assert_stage_review_submitted(db: Session, manuscript_id: int, reviewer_id: int, review_stage: str | None) -> None:
    if not review_stage:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前稿件未处于可提交评审意见的阶段")
    exists = db.query(ReviewSubmission.id).filter(
        ReviewSubmission.manuscript_id == manuscript_id,
        ReviewSubmission.reviewer_id == reviewer_id,
        ReviewSubmission.review_stage == review_stage,
    ).first()
    if not exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请先提交当前阶段的结构化审稿意见")


class EditorManuscriptListItem(BaseModel):
    id: int
    manuscript_no: str
    title: str
    status: str
    current_review_stage: str | None = None
    submitted_by: int
    created_at: str
    current_version_id: int | None
    has_report: bool = False  # 后续有 report 表后填充
    assignments: list[dict] = []
    available_actions: list[str] = []

    class Config:
        from_attributes = True


class EditorActionBody(BaseModel):
    action_type: str  # revision_request | reject | accept | status_change | submit_internal_review | submit_external_review | submit_final_submission
    to_status: str | None = None
    comment: str | None = None


@router.get("/manuscripts")
def editor_manuscript_list(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireReviewStaff)],
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    keyword: str | None = None,
):
    """审稿工作台列表。管理员可查看全部，其他角色仅查看自己被分配的稿件。"""
    q = db.query(Manuscript)
    if user.role != "admin":
        assignment_ids = (
            db.query(ManuscriptAssignment.manuscript_id)
            .filter(ManuscriptAssignment.reviewer_id == user.id)
            .distinct()
            .subquery()
        )
        q = q.filter(Manuscript.id.in_(assignment_ids))
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
    assignments_map = _serialize_assignments(db, [int(m.id) for m in items])

    return {
        "items": [
            EditorManuscriptListItem(
                id=m.id,
                manuscript_no=m.manuscript_no,
                title=m.title,
                status=m.status,
                current_review_stage=m.current_review_stage,
                submitted_by=m.submitted_by,
                created_at=m.created_at.isoformat() if m.created_at else "",
                current_version_id=m.current_version_id,
                has_report=False,
                assignments=assignments_map.get(int(m.id), []),
                available_actions=_available_actions_for_user(user, m, assignments_map.get(int(m.id), [])),
            )
            for m in items
        ],
        "total": total,
    }


@router.get("/manuscripts/{id}")
def editor_manuscript_detail(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireReviewStaff)],
):
    """稿件详情（编辑驾驶舱）：主表、当前版本、解析结果占位、报告占位、编辑操作历史。"""
    m = _get_manuscript_or_404(db, id)
    assignments = _serialize_assignments(db, [id]).get(id, [])
    if not _can_access_manuscript(user, m, assignments):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
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
            "current_review_stage": m.current_review_stage,
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
        "assignments": assignments,
        "available_actions": _available_actions_for_user(user, m, assignments),
        "review_submissions": _serialize_review_submissions(db, id),
        "editor_actions": _serialize_actions(db, id),
    }


@router.get("/manuscripts/{id}/text-for-ai-detect")
def editor_manuscript_text_for_ai_detect(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireReviewStaff)],
):
    """返回当前稿件正文文本，供编辑端跳转 AI 检测页时自动导入。"""
    m = _get_manuscript_or_404(db, id)
    assignments = _serialize_assignments(db, [id]).get(id, [])
    if not _can_access_manuscript(user, m, assignments):
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


VALID_ACTION_TYPES = {"revision_request", "reject", "accept", "status_change", "submit_internal_review", "submit_external_review", "submit_final_submission"}


@router.post("/manuscripts/{id}/actions")
def editor_action(
    id: int,
    body: EditorActionBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireReviewStaff)],
):
    """审稿流转操作：按分配阶段推进、退修、退稿或提交成稿。"""
    if body.action_type not in VALID_ACTION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"action_type 须为 {sorted(VALID_ACTION_TYPES)} 之一",
        )
    m = _get_manuscript_or_404(db, id)
    assignments = _serialize_assignments(db, [id]).get(id, [])
    if not _can_access_manuscript(user, m, assignments):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")

    allowed_actions = set(_available_actions_for_user(user, m, assignments))
    if body.action_type not in allowed_actions and not (user.role == "admin" and body.action_type in VALID_ACTION_TYPES):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前阶段无此操作权限")

    from_status = m.status
    to_status = body.to_status
    next_stage = m.current_review_stage
    flow = next_flow_for_action(body.action_type)

    if body.action_type == "revision_request":
        to_status = "revision_requested"
    elif body.action_type == "reject":
        to_status = "rejected"
        next_stage = None
    elif body.action_type == "accept":
        to_status = "accepted"
        next_stage = None
    elif flow:
        expected_stage, flow_status, next_stage = flow
        if m.current_review_stage != expected_stage:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前审稿阶段与操作不匹配")
        if user.role != "admin":
            _assert_stage_review_submitted(db, id, user.id, expected_stage)
        to_status = flow_status
    elif body.action_type == "status_change" and body.to_status:
        if user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅管理员可手动调整状态")
        to_status = body.to_status
        next_stage = {
            "internal_review": "internal",
            "external_review": "external",
            "final_review": "final",
        }.get(body.to_status)
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
    _assign_sqlite_id(db, EditorAction, action)
    db.add(action)
    m.status = to_status
    m.current_review_stage = next_stage
    db.commit()
    return {"message": "ok", "new_status": to_status, "current_review_stage": next_stage}


class AiReviewResponse(BaseModel):
    content: str
    model: str


class CitationCheckBody(BaseModel):
    use_llm: bool = False


class CitationCheckResponse(BaseModel):
    total: int
    issues: list[dict]


class StructuredReviewBody(BaseModel):
    review_stage: str
    recommendation: str
    overall_score: int | None = None
    originality_score: int | None = None
    rigor_score: int | None = None
    writing_score: int | None = None
    summary: str | None = None
    major_issues: str | None = None
    revision_requirements: str | None = None
    confidential_notes: str | None = None


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


@router.post("/manuscripts/{id}/structured-review", response_model=dict)
def submit_structured_review(
    id: int,
    body: StructuredReviewBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireReviewStaff)],
):
    manuscript = _get_manuscript_or_404(db, id)
    assignments = _serialize_assignments(db, [id]).get(id, [])
    if not _can_access_manuscript(user, manuscript, assignments):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
    if body.review_stage not in REVIEW_STAGES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="review_stage 不合法")
    if body.recommendation not in {"accept", "minor_revision", "major_revision", "reject"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="recommendation 不合法")
    if user.role != "admin" and manuscript.current_review_stage != body.review_stage:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只能提交当前阶段的审稿意见")
    if not _is_assigned_to_stage(user, assignments, body.review_stage):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前阶段未分配给你")

    for score_name in ("overall_score", "originality_score", "rigor_score", "writing_score"):
        score = getattr(body, score_name)
        if score is not None and not (1 <= score <= 10):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="评分需在 1 到 10 之间")

    submission = db.query(ReviewSubmission).filter(
        ReviewSubmission.manuscript_id == id,
        ReviewSubmission.reviewer_id == user.id,
        ReviewSubmission.review_stage == body.review_stage,
    ).first()
    if not submission:
        submission = ReviewSubmission(
            manuscript_id=id,
            reviewer_id=user.id,
            review_stage=body.review_stage,
            recommendation=body.recommendation,
        )
        _assign_sqlite_id(db, ReviewSubmission, submission)
        db.add(submission)

    submission.recommendation = body.recommendation
    submission.overall_score = body.overall_score
    submission.originality_score = body.originality_score
    submission.rigor_score = body.rigor_score
    submission.writing_score = body.writing_score
    submission.summary = (body.summary or "").strip() or None
    submission.major_issues = (body.major_issues or "").strip() or None
    submission.revision_requirements = (body.revision_requirements or "").strip() or None
    submission.confidential_notes = (body.confidential_notes or "").strip() or None
    db.commit()
    return {
        "message": "ok",
        "review_submissions": _serialize_review_submissions(db, id),
    }


@router.post("/manuscripts/{id}/citation-check", response_model=CitationCheckResponse)
def editor_citation_check(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireReviewStaff)],
    body: CitationCheckBody | None = Body(None),
):
    """对当前版本脚注执行引注规范检查，结果写入引注检查报告并返回。body.use_llm=true 时接入大模型辅助判断。"""
    use_llm = body is not None and body.use_llm
    m = _get_manuscript_or_404(db, id)
    assignments = _serialize_assignments(db, [id]).get(id, [])
    if not _can_access_manuscript(user, m, assignments):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
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
    user: Annotated[User, Depends(RequireReviewStaff)],
):
    """生成该稿件的 AI 初审报告（基于标题与当前版本信息，调用大模型）。"""
    try:
        if not is_llm_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="未配置大模型（请在 .env 中设置 DASHSCOPE_API_KEY）",
            )
        m = _get_manuscript_or_404(db, id)
        assignments = _serialize_assignments(db, [id]).get(id, [])
        if not _can_access_manuscript(user, m, assignments):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
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
    user: Annotated[User, Depends(RequireReviewStaff)],
):
    """编辑端：基于当前稿件的智能对话。后端注入稿件上下文后调用大模型。"""
    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="未配置大模型（请在 .env 中设置 DASHSCOPE_API_KEY）",
        )
    m = _get_manuscript_or_404(db, id)
    assignments = _serialize_assignments(db, [id]).get(id, [])
    if not _can_access_manuscript(user, m, assignments):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
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


@router.post("/manuscripts/{id}/revision-draft", response_model=RevisionDraftResponse)
def editor_revision_draft(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireReviewStaff)],
):
    """编辑端：根据当前稿件 AI 初审报告与退修模板，生成退修意见草稿。"""
    draft = ""
    try:
        if not is_llm_configured():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="未配置大模型（请在 .env 中设置 DASHSCOPE_API_KEY）",
            )
        m = _get_manuscript_or_404(db, id)
        assignments = _serialize_assignments(db, [id]).get(id, [])
        if not _can_access_manuscript(user, m, assignments):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
        draft = generate_revision_draft(db, id)
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


@router.post("/manuscripts/{id}/ai-review/jobs", response_model=EnqueueJobResponse)
def enqueue_editor_ai_review_job(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireReviewStaff)],
):
    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="未配置大模型（请在 .env 中设置 DASHSCOPE_API_KEY）",
        )
    m = _get_manuscript_or_404(db, id)
    assignments = _serialize_assignments(db, [id]).get(id, [])
    if not _can_access_manuscript(user, m, assignments):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
    if not m.current_version_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该稿件尚无文件版本")
    job = enqueue_ai_review_job(db, manuscript_id=id, version_id=m.current_version_id, created_by=user.id)
    if not settings.is_production:
        run_job(job.id)
        db.refresh(job)
    return EnqueueJobResponse(job=BackgroundJobResponse(**serialize_job(job)))


@router.post("/manuscripts/{id}/revision-draft/jobs", response_model=EnqueueJobResponse)
def enqueue_editor_revision_draft_job(
    id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireReviewStaff)],
):
    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="未配置大模型（请在 .env 中设置 DASHSCOPE_API_KEY）",
        )
    m = _get_manuscript_or_404(db, id)
    assignments = _serialize_assignments(db, [id]).get(id, [])
    if not _can_access_manuscript(user, m, assignments):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
    job = enqueue_revision_draft_job(db, manuscript_id=id, version_id=m.current_version_id, created_by=user.id)
    if not settings.is_production:
        run_job(job.id)
        db.refresh(job)
    return EnqueueJobResponse(job=BackgroundJobResponse(**serialize_job(job)))


def _get_editor_version_path(id: int, version_id: int, db: Session, user: User):
    """校验权限并返回稿件版本的本地文件路径。"""
    if user.role not in ("internal_reviewer", "external_reviewer", "editor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
    m = _get_manuscript_or_404(db, id)
    assignments = _serialize_assignments(db, [id]).get(id, [])
    if not _can_access_manuscript(user, m, assignments):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
    v = db.query(ManuscriptVersion).filter(ManuscriptVersion.id == version_id, ManuscriptVersion.manuscript_id == id).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="版本不存在")
    path = resolve_path(v.file_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文件不存在")
    return path, v.file_name_original or "manuscript.pdf"


@router.get("/manuscripts/{id}/files/{version_id}/download")
def editor_download_file(
    id: int,
    version_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user_for_download)],
):
    """编辑下载稿件某版本主稿文件。支持 Authorization 或 ?token= 鉴权；需为 editor/admin 角色。"""
    path, filename = _get_editor_version_path(id, version_id, db, user)
    return FileResponse(path, filename=filename)


@router.get("/manuscripts/{id}/files/{version_id}/preview-pdf")
def editor_preview_pdf(
    id: int,
    version_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user_for_download)],
):
    """
    预览用 PDF：若当前版本已是 PDF 则直接返回；若为 .docx/.doc 则用 LibreOffice 转为 PDF 后返回。
    服务器未安装 LibreOffice 时，对 Word 文件返回 503，前端可降级为文本预览或下载原稿。
    """
    path, filename = _get_editor_version_path(id, version_id, db, user)
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return FileResponse(path, filename=filename, media_type="application/pdf")
    if suffix in (".docx", ".doc"):
        cached = get_cached_preview_path(id, version_id)
        if cached and cached.exists():
            return FileResponse(cached, filename=f"{Path(filename).stem}.pdf", media_type="application/pdf")
        try:
            object_key = prepare_pdf_preview(id, version_id, path)
            cached = resolve_path(object_key)
            return FileResponse(cached, filename=f"{Path(filename).stem}.pdf", media_type="application/pdf")
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"{e!s}，请下载原稿查看。",
            )
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该格式不支持预览为 PDF")


@router.post("/manuscripts/{id}/files/{version_id}/preview-pdf/jobs", response_model=EnqueueJobResponse)
def enqueue_editor_preview_pdf_job(
    id: int,
    version_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(RequireReviewStaff)],
):
    path, filename = _get_editor_version_path(id, version_id, db, user)
    if path.suffix.lower() not in (".docx", ".doc"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅 Word 稿件需要生成预览 PDF")
    job = enqueue_preview_pdf_job(db, manuscript_id=id, version_id=version_id, created_by=user.id)
    if not settings.is_production:
        run_job(job.id)
        db.refresh(job)
    return EnqueueJobResponse(job=BackgroundJobResponse(**serialize_job(job)))
