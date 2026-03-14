import logging
from datetime import datetime
from typing import Any

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.config import settings
from app.db.base import SessionLocal
from app.models import BackgroundJob, Manuscript, ManuscriptVersion
from app.services.preview_service import prepare_pdf_preview
from app.services.review_service import generate_full_ai_report, process_manuscript_parsing
from app.services.revision_service import generate_revision_draft
from app.core.storage import resolve_path

logger = logging.getLogger(__name__)

JOB_STATUS_PENDING = "pending"
JOB_STATUS_RUNNING = "running"
JOB_STATUS_SUCCEEDED = "succeeded"
JOB_STATUS_FAILED = "failed"

JOB_TYPE_PARSE_MANUSCRIPT = "parse_manuscript"
JOB_TYPE_AI_REVIEW = "generate_ai_review"
JOB_TYPE_REVISION_DRAFT = "generate_revision_draft"
JOB_TYPE_PREVIEW_PDF = "prepare_preview_pdf"


def _assign_sqlite_id(db: Session, model, obj) -> None:
    if db.bind is not None and db.bind.dialect.name == "sqlite":
        obj.id = (db.query(model.id).order_by(model.id.desc()).limit(1).scalar() or 0) + 1


def enqueue_job(
    db: Session,
    *,
    job_type: str,
    payload: dict[str, Any],
    created_by: int | None = None,
    manuscript_id: int | None = None,
    version_id: int | None = None,
    max_attempts: int | None = None,
) -> BackgroundJob:
    if db.bind is not None and db.bind.dialect.name == "sqlite" and not settings.is_production:
        BackgroundJob.__table__.create(bind=db.bind, checkfirst=True)
    job = BackgroundJob(
        job_type=job_type,
        status=JOB_STATUS_PENDING,
        payload=payload,
        created_by=created_by,
        manuscript_id=manuscript_id,
        version_id=version_id,
        max_attempts=max_attempts or settings.job_max_attempts,
    )
    _assign_sqlite_id(db, BackgroundJob, job)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def serialize_job(job: BackgroundJob) -> dict[str, Any]:
    return {
        "id": job.id,
        "job_type": job.job_type,
        "status": job.status,
        "payload": job.payload or {},
        "result": job.result,
        "error": job.error,
        "attempts": job.attempts,
        "max_attempts": job.max_attempts,
        "manuscript_id": job.manuscript_id,
        "version_id": job.version_id,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
    }


def _claim_job_by_id(db: Session, job_id: int) -> BackgroundJob | None:
    started_at = datetime.now()
    result = db.execute(
        update(BackgroundJob)
        .where(
            BackgroundJob.id == job_id,
            BackgroundJob.status == JOB_STATUS_PENDING,
        )
        .values(
            status=JOB_STATUS_RUNNING,
            attempts=BackgroundJob.attempts + 1,
            error=None,
            started_at=started_at,
            finished_at=None,
        )
    )
    if result.rowcount == 0:
        db.rollback()
        return None
    db.commit()
    return db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()


def _run_parse_job(db: Session, job: BackgroundJob) -> dict[str, Any]:
    version_id = int(job.payload["version_id"])
    parsed = process_manuscript_parsing(db, version_id)
    if not parsed:
        raise ValueError("稿件解析失败")
    return {
        "version_id": version_id,
        "parsed_id": parsed.id,
        "title": parsed.title or "",
    }


def _run_ai_review_job(db: Session, job: BackgroundJob) -> dict[str, Any]:
    manuscript_id = int(job.payload["manuscript_id"])
    version_id = int(job.payload["version_id"])
    report = generate_full_ai_report(db, manuscript_id, version_id)
    if not report:
        raise ValueError("AI 初审报告生成失败")
    content = report.content or {}
    return {
        "manuscript_id": manuscript_id,
        "version_id": version_id,
        "report_id": report.id,
        "model": content.get("model") if isinstance(content, dict) else "",
    }


def _run_revision_draft_job(db: Session, job: BackgroundJob) -> dict[str, Any]:
    manuscript_id = int(job.payload["manuscript_id"])
    draft = generate_revision_draft(db, manuscript_id)
    return {
        "manuscript_id": manuscript_id,
        "draft": draft,
    }


def _run_preview_pdf_job(db: Session, job: BackgroundJob) -> dict[str, Any]:
    manuscript_id = int(job.payload["manuscript_id"])
    version_id = int(job.payload["version_id"])
    version = db.query(ManuscriptVersion).filter(ManuscriptVersion.id == version_id).first()
    if not version:
        raise ValueError("稿件版本不存在")
    source_path = resolve_path(version.file_path)
    object_key = prepare_pdf_preview(manuscript_id, version_id, source_path)
    return {
        "manuscript_id": manuscript_id,
        "version_id": version_id,
        "preview_path": object_key,
    }


JOB_HANDLERS = {
    JOB_TYPE_PARSE_MANUSCRIPT: _run_parse_job,
    JOB_TYPE_AI_REVIEW: _run_ai_review_job,
    JOB_TYPE_REVISION_DRAFT: _run_revision_draft_job,
    JOB_TYPE_PREVIEW_PDF: _run_preview_pdf_job,
}


def _execute_claimed_job(job_id: int) -> BackgroundJob | None:
    db = SessionLocal()
    try:
        job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
        if not job:
            return None
        if job.status != JOB_STATUS_RUNNING:
            return job if job.status == JOB_STATUS_SUCCEEDED else None
        handler = JOB_HANDLERS.get(job.job_type)
        if handler is None:
            raise ValueError(f"不支持的任务类型: {job.job_type}")

        result = handler(db, job)
        job.result = result
        job.status = JOB_STATUS_SUCCEEDED
        job.finished_at = datetime.now()
        db.commit()
        db.refresh(job)
        return job
    except Exception as exc:
        logger.exception("执行后台任务失败 job_id=%s", job_id)
        try:
            job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
            if job:
                job.status = JOB_STATUS_FAILED if int(job.attempts or 0) >= int(job.max_attempts or 1) else JOB_STATUS_PENDING
                job.error = str(exc)
                job.finished_at = datetime.now() if job.status == JOB_STATUS_FAILED else None
                db.commit()
        except Exception:
            db.rollback()
        return None
    finally:
        db.close()


def run_job(job_id: int) -> BackgroundJob | None:
    db = SessionLocal()
    try:
        claimed = _claim_job_by_id(db, job_id)
        if claimed is None:
            existing = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
            return existing if existing and existing.status == JOB_STATUS_SUCCEEDED else None
        claimed_id = int(claimed.id)
    finally:
        db.close()
    return _execute_claimed_job(claimed_id)


def run_next_pending_job() -> BackgroundJob | None:
    db = SessionLocal()
    try:
        attempts = max(1, settings.job_worker_batch_size)
        for _ in range(attempts):
            job = (
                db.query(BackgroundJob)
                .filter(BackgroundJob.status == JOB_STATUS_PENDING)
                .order_by(BackgroundJob.created_at.asc(), BackgroundJob.id.asc())
                .first()
            )
            if not job:
                return None
            claimed = _claim_job_by_id(db, int(job.id))
            if claimed is not None:
                claimed_id = int(claimed.id)
                break
        else:
            return None
    finally:
        db.close()
    return _execute_claimed_job(claimed_id)


def enqueue_parse_job_for_version(db: Session, *, version_id: int, manuscript_id: int, created_by: int | None = None) -> BackgroundJob:
    return enqueue_job(
        db,
        job_type=JOB_TYPE_PARSE_MANUSCRIPT,
        payload={"version_id": version_id},
        created_by=created_by,
        manuscript_id=manuscript_id,
        version_id=version_id,
    )


def enqueue_ai_review_job(db: Session, *, manuscript_id: int, version_id: int, created_by: int | None = None) -> BackgroundJob:
    return enqueue_job(
        db,
        job_type=JOB_TYPE_AI_REVIEW,
        payload={"manuscript_id": manuscript_id, "version_id": version_id},
        created_by=created_by,
        manuscript_id=manuscript_id,
        version_id=version_id,
    )


def enqueue_revision_draft_job(db: Session, *, manuscript_id: int, version_id: int | None = None, created_by: int | None = None) -> BackgroundJob:
    return enqueue_job(
        db,
        job_type=JOB_TYPE_REVISION_DRAFT,
        payload={"manuscript_id": manuscript_id},
        created_by=created_by,
        manuscript_id=manuscript_id,
        version_id=version_id,
    )


def enqueue_preview_pdf_job(db: Session, *, manuscript_id: int, version_id: int, created_by: int | None = None) -> BackgroundJob:
    return enqueue_job(
        db,
        job_type=JOB_TYPE_PREVIEW_PDF,
        payload={"manuscript_id": manuscript_id, "version_id": version_id},
        created_by=created_by,
        manuscript_id=manuscript_id,
        version_id=version_id,
    )


def ensure_job_access(db: Session, *, job_id: int, user_id: int, is_admin: bool) -> BackgroundJob | None:
    query = db.query(BackgroundJob).filter(BackgroundJob.id == job_id)
    if not is_admin:
        query = query.filter(BackgroundJob.created_by == user_id)
    return query.first()


def get_job_related_manuscript(db: Session, job: BackgroundJob) -> Manuscript | None:
    if not job.manuscript_id:
        return None
    return db.query(Manuscript).filter(Manuscript.id == job.manuscript_id).first()
