from datetime import datetime
from typing import Any

from pydantic import BaseModel


class BackgroundJobResponse(BaseModel):
    id: int
    job_type: str
    status: str
    payload: dict[str, Any]
    result: dict[str, Any] | None = None
    error: str | None = None
    attempts: int
    max_attempts: int
    manuscript_id: int | None = None
    version_id: int | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None

    class Config:
        from_attributes = True


class EnqueueJobResponse(BaseModel):
    job: BackgroundJobResponse
