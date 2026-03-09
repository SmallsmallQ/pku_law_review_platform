"""
Word(.docx/.doc) 转 PDF，用于在线预览。依赖系统安装的 LibreOffice（无头模式）。
若未安装 LibreOffice，转换接口将返回 503，前端可降级为文本预览或下载原稿。
"""
import shutil
import subprocess
import tempfile
from pathlib import Path


def _find_libreoffice() -> str | None:
    """查找 LibreOffice 可执行文件。Linux 多为 libreoffice，macOS 多为 soffice。"""
    candidates = [
        "libreoffice",
        "soffice",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    ]
    for cmd in candidates:
        if shutil.which(cmd):
            return cmd
        if cmd.startswith("/") and Path(cmd).exists():
            return cmd
    return None


def convert_to_pdf(source_path: Path) -> Path | None:
    """
    将 Word 文档转为 PDF。source_path 需为 .docx 或 .doc。
    在临时目录生成同名 .pdf，返回生成的 PDF 路径；失败返回 None。
    """
    if not source_path.exists():
        return None
    suffix = source_path.suffix.lower()
    if suffix not in (".docx", ".doc"):
        return None
    lo = _find_libreoffice()
    if not lo:
        return None
    out_dir = Path(tempfile.mkdtemp())
    try:
        subprocess.run(
            [
                lo,
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                str(out_dir),
                str(source_path),
            ],
            capture_output=True,
            timeout=120,
            check=False,
        )
        pdf_name = source_path.stem + ".pdf"
        pdf_path = out_dir / pdf_name
        if pdf_path.exists():
            # 移到新的临时文件，以便调用方在读完后可删除
            final = Path(tempfile.NamedTemporaryFile(suffix=".pdf", delete=False).name)
            shutil.move(str(pdf_path), final)
            return Path(final)
        return None
    except (subprocess.TimeoutExpired, OSError):
        return None
    finally:
        shutil.rmtree(out_dir, ignore_errors=True)
