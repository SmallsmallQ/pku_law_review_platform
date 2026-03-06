import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import docx
import fitz  # PyMuPDF
from pathlib import Path

def parse_docx(file_path: Path) -> Dict[str, Any]:
    """解析 Word 文档。"""
    doc = docx.Document(file_path)
    full_text = []
    paragraphs = []
    
    for para in doc.paragraphs:
        full_text.append(para.text)
        # 简单识别标题（基于样式或加粗，初版简单处理）
        if para.style.name.startswith('Heading') or any(run.bold for run in para.runs if run.text.strip()):
            paragraphs.append({"text": para.text, "is_header": True})
        else:
            paragraphs.append({"text": para.text, "is_header": False})

    # 尝试提取摘要和关键词 (关键词通常在摘要后面)
    abstract = ""
    keywords = ""
    text_str = "\n".join(full_text)
    
    # 简单的正则或关键词匹配（中外法学常见格式）
    if "【摘要】" in text_str:
        parts = text_str.split("【摘要】", 1)
        if len(parts) > 1:
            rest = parts[1]
            if "【关键词】" in rest:
                abstract_part, keywords_part = rest.split("【关键词】", 1)
                abstract = abstract_part.split("\n", 1)[0].strip()
                keywords = keywords_part.split("\n", 1)[0].strip()
            else:
                abstract = rest.split("\n", 1)[0].strip()

    return {
        "title": doc.paragraphs[0].text if doc.paragraphs else "",
        "abstract": abstract,
        "keywords": keywords,
        "body_text": text_str,
        "body_structure": paragraphs,
        "footnotes_raw": [note.text for note in doc.sections[0].footer.paragraphs] if hasattr(doc, 'sections') and doc.sections else [], # Simplified
        "references_raw": [],
        "author_info": {},
        "word_count": len(text_str)
    }

def parse_pdf(file_path: Path) -> Dict[str, Any]:
    """解析 PDF 文档。"""
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    
    # PDF 解析相对复杂，初版仅提取全文
    return {
        "title": os.path.basename(file_path),
        "abstract": "",
        "keywords": "",
        "body_text": text,
        "body_structure": [],
        "footnotes_raw": [],
        "references_raw": [],
        "author_info": {},
        "word_count": len(text)
    }

def parse_manuscript(file_path: str) -> Dict[str, Any]:
    """根据文件扩展名选择解析器。"""
    path = Path(file_path)
    ext = path.suffix.lower()
    
    if ext == ".docx":
        return parse_docx(path)
    elif ext == ".pdf":
        return parse_pdf(path)
    else:
        # 不支持的格式，返回最小信息
        return {
            "title": path.name,
            "abstract": "",
            "keywords": "",
            "body_text": "",
            "body_structure": [],
            "footnotes_raw": [],
            "references_raw": [],
            "author_info": {},
            "word_count": 0
        }
