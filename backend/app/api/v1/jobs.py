from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.base import get_db
from app.models import User
from app.schemas.job import BackgroundJobResponse, EnqueueJobResponse
from app.services.job_queue import ensure_job_access, serialize_job

router = APIRouter()


@router.get("/{job_id}", response_model=BackgroundJobResponse)
def get_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    job = ensure_job_access(db, job_id=job_id, user_id=user.id, is_admin=user.role == "admin")
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")
    return BackgroundJobResponse(**serialize_job(job))
