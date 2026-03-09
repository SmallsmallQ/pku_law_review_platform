from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.types import IDType


class ManuscriptAssignment(Base):
    __tablename__ = "manuscript_assignments"
    __table_args__ = (
        UniqueConstraint("manuscript_id", "review_stage", name="uq_manuscript_stage_assignment"),
    )

    id = Column(IDType, primary_key=True, autoincrement=True)
    manuscript_id = Column(IDType, ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(IDType, ForeignKey("users.id"), nullable=False, index=True)
    assigned_by = Column(IDType, ForeignKey("users.id"), nullable=False, index=True)
    review_stage = Column(String(20), nullable=False, index=True)  # internal | external | final
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
