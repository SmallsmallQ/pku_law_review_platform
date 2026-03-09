"""
ORM 模型。与 docs/database-schema.md 对齐。
"""
from app.models.user import User
from app.models.section import Section
from app.models.manuscript import Manuscript, ManuscriptVersion
from app.models.manuscript_assignment import ManuscriptAssignment
from app.models.review_submission import ReviewSubmission
from app.models.parser_models import (
    ManuscriptParsed,
    ReviewReport,
    CitationIssue,
    SimilarityResult,
    KnowledgeChunk,
)
from app.models.editor_action import EditorAction
from app.models.revision_template import RevisionTemplate
from app.models.system_config import SystemConfig

__all__ = [
    "User",
    "Section",
    "Manuscript",
    "ManuscriptVersion",
    "ManuscriptAssignment",
    "ReviewSubmission",
    "ManuscriptParsed",
    "ReviewReport",
    "CitationIssue",
    "SimilarityResult",
    "KnowledgeChunk",
    "EditorAction",
    "RevisionTemplate",
    "SystemConfig",
]
