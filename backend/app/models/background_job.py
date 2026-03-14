from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.types import IDType


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id = Column(IDType, primary_key=True, autoincrement=True)
    job_type = Column(String(50), nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True, default="pending")
    payload = Column(JSON, nullable=False)
    result = Column(JSON)
    error = Column(Text)
    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    created_by = Column(IDType, ForeignKey("users.id"), index=True)
    manuscript_id = Column(IDType, ForeignKey("manuscripts.id", ondelete="CASCADE"), index=True)
    version_id = Column(IDType, ForeignKey("manuscript_versions.id", ondelete="CASCADE"), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))
