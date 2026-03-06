from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.types import IDType


class ManuscriptParsed(Base):
    __tablename__ = "manuscript_parsed"

    id = Column(IDType, primary_key=True, autoincrement=True)
    version_id = Column(IDType, ForeignKey("manuscript_versions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    title = Column(String(500))
    abstract = Column(Text)
    keywords = Column(String(500))
    body_text = Column(Text)
    body_structure = Column(JSON)
    footnotes_raw = Column(JSON)
    references_raw = Column(JSON)
    author_info = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    version = relationship("ManuscriptVersion", backref="parsed_content")


class ReviewReport(Base):
    __tablename__ = "review_reports"

    id = Column(IDType, primary_key=True, autoincrement=True)
    manuscript_id = Column(IDType, ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    version_id = Column(IDType, ForeignKey("manuscript_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type = Column(String(20), default="preliminary")
    content = Column(JSON, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    manuscript = relationship("Manuscript")
    version = relationship("ManuscriptVersion")
    citation_issues = relationship("CitationIssue", back_populates="report", cascade="all, delete-orphan")
    similarity_results = relationship("SimilarityResult", back_populates="report", cascade="all, delete-orphan")


class CitationIssue(Base):
    __tablename__ = "citation_issues"

    id = Column(IDType, primary_key=True, autoincrement=True)
    report_id = Column(IDType, ForeignKey("review_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    location = Column(String(200))
    issue_type = Column(String(50))
    description = Column(Text)
    suggestion = Column(Text)
    severity = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    report = relationship("ReviewReport", back_populates="citation_issues")


class SimilarityResult(Base):
    __tablename__ = "similarity_results"

    id = Column(IDType, primary_key=True, autoincrement=True)
    report_id = Column(IDType, ForeignKey("review_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    source_version_id = Column(IDType, ForeignKey("manuscript_versions.id"), nullable=False)
    target_type = Column(String(30))
    target_id = Column(String(100))
    source_excerpt = Column(Text)
    target_excerpt = Column(Text)
    score = Column(Numeric(5, 4))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    report = relationship("ReviewReport", back_populates="similarity_results")


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(IDType, primary_key=True, autoincrement=True)
    source_type = Column(String(30), nullable=False)
    source_id = Column(String(100), nullable=False)
    manuscript_id = Column(IDType, ForeignKey("manuscripts.id"), index=True)
    version_id = Column(IDType, ForeignKey("manuscript_versions.id"), index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    meta = Column(JSON)
    # embedding vector(1536) for pgvector, using Text as placeholder for now if pgvector is not installed
    # embedding = Column(...) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
