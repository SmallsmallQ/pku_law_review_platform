from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class RevisionTemplate(Base):
    __tablename__ = "revision_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100))
    content = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
