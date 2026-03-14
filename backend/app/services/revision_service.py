from sqlalchemy.orm import Session

from app.models import Manuscript, ReviewReport, RevisionTemplate
from app.services.llm import chat_completion, is_llm_configured


def _normalize_report_payload(report_obj: ReviewReport | None) -> tuple[str, str]:
    if not report_obj or not report_obj.content:
        return "", ""
    raw = report_obj.content
    if isinstance(raw, dict):
        return str(raw.get("text") or ""), str(raw.get("model") or "")
    return str(raw), ""


def _get_revision_templates_safe(db: Session):
    try:
        return db.query(RevisionTemplate).filter(RevisionTemplate.is_active.is_(True)).order_by(RevisionTemplate.id).all()
    except Exception:
        return []


def generate_revision_draft(db: Session, manuscript_id: int) -> str:
    if not is_llm_configured():
        raise ValueError("未配置大模型（请在 .env 中设置 DASHSCOPE_API_KEY）")

    manuscript = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not manuscript:
        raise ValueError("稿件不存在")
    if not manuscript.current_version_id:
        raise ValueError("该稿件尚无版本，无法生成退修意见")

    report_obj = db.query(ReviewReport).filter(
        ReviewReport.manuscript_id == manuscript_id,
        ReviewReport.version_id == manuscript.current_version_id,
        ReviewReport.report_type == "preliminary",
    ).first()
    report_text, _ = _normalize_report_payload(report_obj)
    templates = _get_revision_templates_safe(db)
    template_block = "\n\n".join(
        f"【{t.name or '模板'}】\n{str(t.content or '')}" for t in templates
    ) if templates else "（暂无退修模板，请管理员在后台配置）"
    prompt_instruction = """请根据以下「初审报告」和「本刊退修模板要求」，生成一段给作者的退修意见草稿。
要求：简洁、专业、直接面向作者；条理清晰；可分点列出主要修改方向；不要简单复述报告全文。"""
    user_content = f"""## 初审报告\n{report_text[:8000] if report_text else '（暂无初审报告，请先生成 AI 初审报告）'}\n\n## 本刊退修模板（可参考）\n{template_block}\n\n请直接输出退修意见正文，不要加「草稿」等前缀。"""
    messages = [
        {"role": "system", "content": prompt_instruction},
        {"role": "user", "content": user_content},
    ]
    draft = chat_completion(messages, max_tokens=1500, timeout=55)
    return (draft or "").strip()
