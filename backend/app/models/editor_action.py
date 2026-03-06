from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class EditorAction(Base):
    __tablename__ = "editor_actions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    manuscript_id = Column(BigInteger, ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    editor_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String(30), nullable=False)  # status_change | revision_request | reject | accept
    from_status = Column(String(30))
    to_status = Column(String(30))
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
