from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.types import IDType


class EditorAction(Base):
    __tablename__ = "editor_actions"

    id = Column(IDType, primary_key=True, autoincrement=True)
    manuscript_id = Column(IDType, ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    editor_id = Column(IDType, ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String(30), nullable=False)  # status_change | revision_request | reject | accept
    from_status = Column(String(30))
    to_status = Column(String(30))
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
