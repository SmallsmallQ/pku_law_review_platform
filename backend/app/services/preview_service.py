from pathlib import Path

from app.core.storage import resolve_path, save_generated_file, storage_path_exists
from app.services.docx_to_pdf import convert_to_pdf


def preview_object_key(manuscript_id: int, version_id: int) -> str:
    return f"derived/manuscripts/{manuscript_id}/{version_id}/preview.pdf"


def get_cached_preview_path(manuscript_id: int, version_id: int) -> Path | None:
    object_key = preview_object_key(manuscript_id, version_id)
    if not storage_path_exists(object_key):
        return None
    return resolve_path(object_key)


def prepare_pdf_preview(manuscript_id: int, version_id: int, source_path: Path) -> str:
    if source_path.suffix.lower() not in (".docx", ".doc"):
        raise ValueError("仅 Word 文件需要生成预览 PDF")
    pdf_path = convert_to_pdf(source_path)
    if pdf_path is None:
        raise ValueError("Word 转 PDF 不可用（请确认服务器已安装 LibreOffice）")
    try:
        object_key = preview_object_key(manuscript_id, version_id)
        save_generated_file(object_key, "preview.pdf", pdf_path.read_bytes())
        return object_key
    finally:
        try:
            pdf_path.unlink(missing_ok=True)
        except OSError:
            pass
