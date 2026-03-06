import json
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import Manuscript, ManuscriptVersion, ManuscriptParsed, ReviewReport
from app.services.parser import parse_manuscript
from app.services.llm import chat_completion, is_llm_configured
from app.core.storage import resolve_path
from app.config import settings

def process_manuscript_parsing(db: Session, version_id: int):
    """解析稿件并保存解析结果。"""
    version = db.query(ManuscriptVersion).filter(ManuscriptVersion.id == version_id).first()
    if not version:
        return None
    
    file_path = resolve_path(version.file_path)
    if not file_path.exists():
        return None
    
    # 调用解析器
    parsed_data = parse_manuscript(str(file_path))
    
    # 更新版本信息（字数、解析时间）
    version.word_count = parsed_data.get("word_count", 0)
    version.parsed_at = datetime.now()
    
    # 保存解析结果
    parsed_obj = db.query(ManuscriptParsed).filter(ManuscriptParsed.version_id == version_id).first()
    if not parsed_obj:
        parsed_obj = ManuscriptParsed(version_id=version_id)
        db.add(parsed_obj)
    
    parsed_obj.title = parsed_data.get("title")
    parsed_obj.abstract = parsed_data.get("abstract")
    parsed_obj.keywords = parsed_data.get("keywords")
    parsed_obj.body_text = parsed_data.get("body_text")
    parsed_obj.body_structure = parsed_data.get("body_structure")
    parsed_obj.footnotes_raw = parsed_data.get("footnotes_raw")
    parsed_obj.references_raw = parsed_data.get("references_raw")
    parsed_obj.author_info = parsed_data.get("author_info")
    
    db.commit()
    return parsed_obj

def generate_full_ai_report(db: Session, manuscript_id: int, version_id: int) -> Optional[ReviewReport]:
    """生成完整的 AI 初审报告。"""
    if not is_llm_configured():
        return None
    
    m = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    v = db.query(ManuscriptVersion).filter(ManuscriptVersion.id == version_id).first()
    if not m or not v:
        return None
    
    # 确保已有解析结果
    parsed = db.query(ManuscriptParsed).filter(ManuscriptParsed.version_id == version_id).first()
    if not parsed:
        parsed = process_manuscript_parsing(db, version_id)
    
    if not parsed:
        return None

    # 构建 Prompt
    title = parsed.title or m.title or "（无标题）"
    abstract = parsed.abstract or "（未提取到摘要）"
    keywords = parsed.keywords or "（未提取到关键词）"
    # 正文取前 3000 字用于初步审核，避免超出合规或 token 限制
    body_preview = (parsed.body_text or "")[:3000]
    
    manuscript_context = f"""
稿件编号：{m.manuscript_no}
标题：{title}
摘要：{abstract}
关键词：{keywords}
正文预览（前3000字）：
{body_preview}
"""

    system_prompt = """你是一位资深的法学期刊编辑和审稿专家。
你的任务是为一篇法学投稿生成一份详细的初审报告。这份报告将辅助责任编辑决定是否将稿件送外审、退修或退稿。
请保持专业、严谨、客观。报告应包括：总体印象、形式规范建议、引注与写作规范、以及具体的修改建议。"""

    user_prompt = f"""请对以下稿件进行初审分析并生成 Markdown 格式的报告：

{manuscript_context}

请按照以下结构输出报告：
1. **稿件概览**：简述选题意义及与本刊的相关度。
2. **结构评估**：逻辑是否严密，章节安排是否合理。
3. **形式规范**：标题、摘要、关键词、脚注等是否符合学术规范。
4. **核心优点与问题**：指出 2-3 个核心优点和存在的关键问题。
5. **具体修改意见**：给出可操作的修改建议。

请直接返回 Markdown 格式。"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    
    try:
        content = chat_completion(messages, max_tokens=2500)
        
        # 创建或更新报告
        report = db.query(ReviewReport).filter(
            ReviewReport.manuscript_id == manuscript_id,
            ReviewReport.version_id == version_id,
            ReviewReport.report_type == "preliminary"
        ).first()
        
        if not report:
            report = ReviewReport(
                manuscript_id=manuscript_id,
                version_id=version_id,
                report_type="preliminary"
            )
            db.add(report)
        
        report.content = {"text": content, "model": settings.llm_model}
        report.generated_at = datetime.now()
        
        db.commit()
        return report
    except Exception as e:
        print(f"Error generating AI report: {e}")
        return None
