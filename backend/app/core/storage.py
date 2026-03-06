"""
本地文件存储：稿件与补充材料。初版用本地目录，路径规则 manuscripts/{manuscript_id}/{version_id}/main.* | supplement.*
"""
import os
import uuid
from pathlib import Path

from app.config import settings

ALLOWED_EXTENSIONS = {".docx", ".doc", ".pdf"}


def _base() -> Path:
    p = Path(settings.storage_local_path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def manuscript_dir(manuscript_id: int, version_number: int) -> Path:
    """按稿件 id 与版本号组织目录（版本号在创建 version 记录前即确定）。"""
    d = _base() / "manuscripts" / str(manuscript_id) / str(version_number)
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_manuscript_file(manuscript_id: int, version_number: int, filename: str, content: bytes) -> str:
    """保存主稿文件，返回相对存储路径（用于 DB file_path）。"""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"不支持的文件类型: {ext}，仅支持 {ALLOWED_EXTENSIONS}")
    d = manuscript_dir(manuscript_id, version_number)
    name = f"main{ext}"
    path = d / name
    path.write_bytes(content)
    return f"manuscripts/{manuscript_id}/{version_number}/{name}"


def save_supplement_file(manuscript_id: int, version_number: int, filename: str, content: bytes) -> str:
    """保存补充材料，返回相对路径。"""
    ext = Path(filename).suffix.lower() or ".bin"
    d = manuscript_dir(manuscript_id, version_number)
    name = f"supplement_{uuid.uuid4().hex[:8]}{ext}"
    path = d / name
    path.write_bytes(content)
    return f"manuscripts/{manuscript_id}/{version_number}/{name}"


def resolve_path(relative_path: str) -> Path:
    """相对路径 -> 绝对路径，用于读取/下载。"""
    return _base() / relative_path


def get_full_path(relative_path: str) -> Path:
    """同 resolve_path。"""
    return resolve_path(relative_path)
