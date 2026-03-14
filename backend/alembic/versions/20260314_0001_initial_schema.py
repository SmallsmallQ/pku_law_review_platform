"""initial schema

Revision ID: 20260314_0001
Revises: 
Create Date: 2026-03-14 00:00:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260314_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "revision_templates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "sections",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "system_config",
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("real_name", sa.String(length=100), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("institution", sa.String(length=200), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("name_en_first", sa.String(length=50), nullable=True),
        sa.Column("name_en_middle", sa.String(length=50), nullable=True),
        sa.Column("name_en_last", sa.String(length=50), nullable=True),
        sa.Column("salutation", sa.String(length=20), nullable=True),
        sa.Column("ethnicity", sa.String(length=20), nullable=True),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("postal_address", sa.String(length=300), nullable=True),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column("research_field", sa.String(length=200), nullable=True),
        sa.Column("title_zh", sa.String(length=50), nullable=True),
        sa.Column("title_en", sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "manuscripts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("manuscript_no", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("submitted_by", sa.BigInteger(), nullable=False),
        sa.Column("section_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("current_review_stage", sa.String(length=20), nullable=True),
        sa.Column("current_version_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["section_id"], ["sections.id"]),
        sa.ForeignKeyConstraint(["submitted_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_manuscripts_current_review_stage"), "manuscripts", ["current_review_stage"], unique=False)
    op.create_index(op.f("ix_manuscripts_manuscript_no"), "manuscripts", ["manuscript_no"], unique=True)
    op.create_index(op.f("ix_manuscripts_status"), "manuscripts", ["status"], unique=False)
    op.create_index(op.f("ix_manuscripts_submitted_by"), "manuscripts", ["submitted_by"], unique=False)

    op.create_table(
        "editor_actions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("manuscript_id", sa.BigInteger(), nullable=False),
        sa.Column("editor_id", sa.BigInteger(), nullable=False),
        sa.Column("action_type", sa.String(length=30), nullable=False),
        sa.Column("from_status", sa.String(length=30), nullable=True),
        sa.Column("to_status", sa.String(length=30), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["editor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["manuscript_id"], ["manuscripts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_editor_actions_editor_id"), "editor_actions", ["editor_id"], unique=False)
    op.create_index(op.f("ix_editor_actions_manuscript_id"), "editor_actions", ["manuscript_id"], unique=False)

    op.create_table(
        "manuscript_versions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("manuscript_id", sa.BigInteger(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("file_name_original", sa.String(length=255), nullable=True),
        sa.Column("supplement_path", sa.String(length=500), nullable=True),
        sa.Column("parsed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("word_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["manuscript_id"], ["manuscripts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_manuscript_versions_manuscript_id"), "manuscript_versions", ["manuscript_id"], unique=False)
    op.create_foreign_key(
        "fk_manuscripts_current_version_id",
        "manuscripts",
        "manuscript_versions",
        ["current_version_id"],
        ["id"],
    )

    op.create_table(
        "background_jobs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("job_type", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.Column("manuscript_id", sa.BigInteger(), nullable=True),
        sa.Column("version_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["manuscript_id"], ["manuscripts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["version_id"], ["manuscript_versions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_background_jobs_created_by"), "background_jobs", ["created_by"], unique=False)
    op.create_index(op.f("ix_background_jobs_job_type"), "background_jobs", ["job_type"], unique=False)
    op.create_index(op.f("ix_background_jobs_manuscript_id"), "background_jobs", ["manuscript_id"], unique=False)
    op.create_index(op.f("ix_background_jobs_status"), "background_jobs", ["status"], unique=False)
    op.create_index(op.f("ix_background_jobs_version_id"), "background_jobs", ["version_id"], unique=False)

    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("source_id", sa.String(length=100), nullable=False),
        sa.Column("manuscript_id", sa.BigInteger(), nullable=True),
        sa.Column("version_id", sa.BigInteger(), nullable=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["manuscript_id"], ["manuscripts.id"]),
        sa.ForeignKeyConstraint(["version_id"], ["manuscript_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_knowledge_chunks_manuscript_id"), "knowledge_chunks", ["manuscript_id"], unique=False)
    op.create_index(op.f("ix_knowledge_chunks_version_id"), "knowledge_chunks", ["version_id"], unique=False)

    op.create_table(
        "manuscript_assignments",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("manuscript_id", sa.BigInteger(), nullable=False),
        sa.Column("reviewer_id", sa.BigInteger(), nullable=False),
        sa.Column("assigned_by", sa.BigInteger(), nullable=False),
        sa.Column("review_stage", sa.String(length=20), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["manuscript_id"], ["manuscripts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("manuscript_id", "review_stage", name="uq_manuscript_stage_assignment"),
    )
    op.create_index(op.f("ix_manuscript_assignments_assigned_by"), "manuscript_assignments", ["assigned_by"], unique=False)
    op.create_index(op.f("ix_manuscript_assignments_manuscript_id"), "manuscript_assignments", ["manuscript_id"], unique=False)
    op.create_index(op.f("ix_manuscript_assignments_review_stage"), "manuscript_assignments", ["review_stage"], unique=False)
    op.create_index(op.f("ix_manuscript_assignments_reviewer_id"), "manuscript_assignments", ["reviewer_id"], unique=False)

    op.create_table(
        "manuscript_parsed",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("version_id", sa.BigInteger(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=True),
        sa.Column("abstract", sa.Text(), nullable=True),
        sa.Column("keywords", sa.String(length=500), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("body_structure", sa.JSON(), nullable=True),
        sa.Column("footnotes_raw", sa.JSON(), nullable=True),
        sa.Column("references_raw", sa.JSON(), nullable=True),
        sa.Column("author_info", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["version_id"], ["manuscript_versions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_manuscript_parsed_version_id"), "manuscript_parsed", ["version_id"], unique=True)

    op.create_table(
        "review_reports",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("manuscript_id", sa.BigInteger(), nullable=False),
        sa.Column("version_id", sa.BigInteger(), nullable=False),
        sa.Column("report_type", sa.String(length=20), nullable=True),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["manuscript_id"], ["manuscripts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["version_id"], ["manuscript_versions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_review_reports_manuscript_id"), "review_reports", ["manuscript_id"], unique=False)
    op.create_index(op.f("ix_review_reports_version_id"), "review_reports", ["version_id"], unique=False)

    op.create_table(
        "review_submissions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("manuscript_id", sa.BigInteger(), nullable=False),
        sa.Column("reviewer_id", sa.BigInteger(), nullable=False),
        sa.Column("review_stage", sa.String(length=20), nullable=False),
        sa.Column("recommendation", sa.String(length=30), nullable=False),
        sa.Column("overall_score", sa.Integer(), nullable=True),
        sa.Column("originality_score", sa.Integer(), nullable=True),
        sa.Column("rigor_score", sa.Integer(), nullable=True),
        sa.Column("writing_score", sa.Integer(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("major_issues", sa.Text(), nullable=True),
        sa.Column("revision_requirements", sa.Text(), nullable=True),
        sa.Column("confidential_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["manuscript_id"], ["manuscripts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("manuscript_id", "review_stage", "reviewer_id", name="uq_review_submission_stage_reviewer"),
    )
    op.create_index(op.f("ix_review_submissions_manuscript_id"), "review_submissions", ["manuscript_id"], unique=False)
    op.create_index(op.f("ix_review_submissions_review_stage"), "review_submissions", ["review_stage"], unique=False)
    op.create_index(op.f("ix_review_submissions_reviewer_id"), "review_submissions", ["reviewer_id"], unique=False)

    op.create_table(
        "citation_issues",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("report_id", sa.BigInteger(), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("issue_type", sa.String(length=50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("suggestion", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["review_reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_citation_issues_report_id"), "citation_issues", ["report_id"], unique=False)

    op.create_table(
        "similarity_results",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("report_id", sa.BigInteger(), nullable=False),
        sa.Column("source_version_id", sa.BigInteger(), nullable=False),
        sa.Column("target_type", sa.String(length=30), nullable=True),
        sa.Column("target_id", sa.String(length=100), nullable=True),
        sa.Column("source_excerpt", sa.Text(), nullable=True),
        sa.Column("target_excerpt", sa.Text(), nullable=True),
        sa.Column("score", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["report_id"], ["review_reports.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_version_id"], ["manuscript_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_similarity_results_report_id"), "similarity_results", ["report_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_similarity_results_report_id"), table_name="similarity_results")
    op.drop_table("similarity_results")

    op.drop_index(op.f("ix_citation_issues_report_id"), table_name="citation_issues")
    op.drop_table("citation_issues")

    op.drop_index(op.f("ix_review_submissions_reviewer_id"), table_name="review_submissions")
    op.drop_index(op.f("ix_review_submissions_review_stage"), table_name="review_submissions")
    op.drop_index(op.f("ix_review_submissions_manuscript_id"), table_name="review_submissions")
    op.drop_table("review_submissions")

    op.drop_index(op.f("ix_review_reports_version_id"), table_name="review_reports")
    op.drop_index(op.f("ix_review_reports_manuscript_id"), table_name="review_reports")
    op.drop_table("review_reports")

    op.drop_index(op.f("ix_background_jobs_version_id"), table_name="background_jobs")
    op.drop_index(op.f("ix_background_jobs_status"), table_name="background_jobs")
    op.drop_index(op.f("ix_background_jobs_manuscript_id"), table_name="background_jobs")
    op.drop_index(op.f("ix_background_jobs_job_type"), table_name="background_jobs")
    op.drop_index(op.f("ix_background_jobs_created_by"), table_name="background_jobs")
    op.drop_table("background_jobs")

    op.drop_index(op.f("ix_manuscript_parsed_version_id"), table_name="manuscript_parsed")
    op.drop_table("manuscript_parsed")

    op.drop_index(op.f("ix_manuscript_assignments_reviewer_id"), table_name="manuscript_assignments")
    op.drop_index(op.f("ix_manuscript_assignments_review_stage"), table_name="manuscript_assignments")
    op.drop_index(op.f("ix_manuscript_assignments_manuscript_id"), table_name="manuscript_assignments")
    op.drop_index(op.f("ix_manuscript_assignments_assigned_by"), table_name="manuscript_assignments")
    op.drop_table("manuscript_assignments")

    op.drop_index(op.f("ix_knowledge_chunks_version_id"), table_name="knowledge_chunks")
    op.drop_index(op.f("ix_knowledge_chunks_manuscript_id"), table_name="knowledge_chunks")
    op.drop_table("knowledge_chunks")

    op.drop_constraint("fk_manuscripts_current_version_id", "manuscripts", type_="foreignkey")
    op.drop_index(op.f("ix_manuscript_versions_manuscript_id"), table_name="manuscript_versions")
    op.drop_table("manuscript_versions")

    op.drop_index(op.f("ix_editor_actions_manuscript_id"), table_name="editor_actions")
    op.drop_index(op.f("ix_editor_actions_editor_id"), table_name="editor_actions")
    op.drop_table("editor_actions")

    op.drop_index(op.f("ix_manuscripts_submitted_by"), table_name="manuscripts")
    op.drop_index(op.f("ix_manuscripts_status"), table_name="manuscripts")
    op.drop_index(op.f("ix_manuscripts_manuscript_no"), table_name="manuscripts")
    op.drop_index(op.f("ix_manuscripts_current_review_stage"), table_name="manuscripts")
    op.drop_table("manuscripts")

    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    op.drop_table("system_config")
    op.drop_table("sections")
    op.drop_table("revision_templates")
