from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.types import IDType


class ReviewSubmission(Base):
    __tablename__ = "review_submissions"
    __table_args__ = (
        UniqueConstraint("manuscript_id", "review_stage", "reviewer_id", name="uq_review_submission_stage_reviewer"),
    )

    id = Column(IDType, primary_key=True, autoincrement=True)
    manuscript_id = Column(IDType, ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(IDType, ForeignKey("users.id"), nullable=False, index=True)
    review_stage = Column(String(20), nullable=False, index=True)  # internal | external | final
    recommendation = Column(String(30), nullable=False)  # accept | minor_revision | major_revision | reject
    overall_score = Column(Integer)
    originality_score = Column(Integer)
    rigor_score = Column(Integer)
    writing_score = Column(Integer)
    summary = Column(Text)
    major_issues = Column(Text)
    revision_requirements = Column(Text)
    confidential_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
