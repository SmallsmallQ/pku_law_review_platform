from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Manuscript(Base):
    __tablename__ = "manuscripts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    manuscript_no = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    submitted_by = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"))
    status = Column(String(30), nullable=False, index=True)
    current_version_id = Column(BigInteger, ForeignKey("manuscript_versions.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    versions = relationship(
        "ManuscriptVersion",
        back_populates="manuscript",
        foreign_keys="ManuscriptVersion.manuscript_id",
    )
    current_version = relationship(
        "ManuscriptVersion",
        foreign_keys=[current_version_id],
        post_update=True,
    )


class ManuscriptVersion(Base):
    __tablename__ = "manuscript_versions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    manuscript_id = Column(BigInteger, ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name_original = Column(String(255))
    supplement_path = Column(String(500))
    parsed_at = Column(DateTime(timezone=True))
    word_count = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    manuscript = relationship("Manuscript", back_populates="versions", foreign_keys=[manuscript_id])
