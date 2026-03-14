"""
文件存储抽象。

- `local`：直接落盘到本地目录
- `minio` / `s3`：使用 S3 兼容接口存储对象，读取时按需拉到本地临时缓存
"""
import hashlib
import mimetypes
import uuid
from pathlib import Path

from app.config import settings

ALLOWED_EXTENSIONS = {".docx", ".doc", ".pdf"}
REMOTE_CACHE_DIR = Path("/tmp/law_review_storage_cache")

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ModuleNotFoundError:  # pragma: no cover - 兼容本地尚未安装对象存储依赖
    boto3 = None

    class BotoCoreError(Exception):
        pass

    class ClientError(Exception):
        pass


def _ensure_allowed_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"不支持的文件类型: {ext}，仅支持 {sorted(ALLOWED_EXTENSIONS)}")
    return ext


class LocalStorageBackend:
    def __init__(self, root: str):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save_bytes(self, object_key: str, content: bytes, *, content_type: str | None = None) -> str:
        path = self.root / object_key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return object_key

    def resolve_path(self, object_key: str) -> Path:
        return self.root / object_key

    def exists(self, object_key: str) -> bool:
        return (self.root / object_key).exists()

    def healthcheck(self) -> bool:
        self.root.mkdir(parents=True, exist_ok=True)
        return self.root.exists() and self.root.is_dir()


class S3CompatibleStorageBackend:
    def __init__(self):
        if boto3 is None:
            raise RuntimeError("当前环境未安装 boto3，无法启用 S3/MinIO 存储。请先安装 backend/requirements.txt 依赖。")
        client_kwargs = {
            "aws_access_key_id": settings.storage_access_key,
            "aws_secret_access_key": settings.storage_secret_key,
        }
        if settings.storage_region:
            client_kwargs["region_name"] = settings.storage_region
        if settings.storage_endpoint:
            client_kwargs["endpoint_url"] = settings.storage_endpoint
        if not settings.storage_secure and settings.storage_endpoint and settings.storage_endpoint.startswith("https://"):
            client_kwargs["use_ssl"] = False
        self.bucket = settings.storage_bucket
        self.client = boto3.client("s3", **client_kwargs)
        REMOTE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def save_bytes(self, object_key: str, content: bytes, *, content_type: str | None = None) -> str:
        put_kwargs = {
            "Bucket": self.bucket,
            "Key": object_key,
            "Body": content,
        }
        if content_type:
            put_kwargs["ContentType"] = content_type
        self.client.put_object(**put_kwargs)
        return object_key

    def resolve_path(self, object_key: str) -> Path:
        suffix = Path(object_key).suffix
        cache_name = f"{hashlib.sha256(object_key.encode('utf-8')).hexdigest()}{suffix}"
        cache_path = REMOTE_CACHE_DIR / cache_name
        if not cache_path.exists():
            self.client.download_file(self.bucket, object_key, str(cache_path))
        return cache_path

    def exists(self, object_key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=object_key)
            return True
        except ClientError:
            return False

    def healthcheck(self) -> bool:
        self.client.head_bucket(Bucket=self.bucket)
        return True


def _backend():
    if settings.storage_type == "local":
        return LocalStorageBackend(settings.storage_local_path)
    return S3CompatibleStorageBackend()


def _guess_content_type(filename: str) -> str | None:
    guessed, _ = mimetypes.guess_type(filename)
    return guessed


def manuscript_dir(manuscript_id: int, version_number: int) -> Path:
    """
    兼容旧调用：本地模式返回真实目录；对象存储模式返回逻辑目录路径。
    """
    logical = Path("manuscripts") / str(manuscript_id) / str(version_number)
    if settings.storage_type == "local":
        backend = _backend()
        return backend.resolve_path(str(logical))
    return logical


def save_manuscript_file(manuscript_id: int, version_number: int, filename: str, content: bytes) -> str:
    """保存主稿文件，返回逻辑存储路径（用于 DB file_path）。"""
    ext = _ensure_allowed_extension(filename)
    object_key = f"manuscripts/{manuscript_id}/{version_number}/main{ext}"
    return _backend().save_bytes(object_key, content, content_type=_guess_content_type(filename))


def save_supplement_file(manuscript_id: int, version_number: int, filename: str, content: bytes) -> str:
    """保存补充材料，返回逻辑存储路径。"""
    ext = Path(filename).suffix.lower() or ".bin"
    object_key = f"manuscripts/{manuscript_id}/{version_number}/supplement_{uuid.uuid4().hex[:8]}{ext}"
    return _backend().save_bytes(object_key, content, content_type=_guess_content_type(filename))


def save_generated_file(relative_path: str, filename: str, content: bytes) -> str:
    """保存派生文件，例如预览 PDF 或任务产物。"""
    return _backend().save_bytes(relative_path, content, content_type=_guess_content_type(filename))


def resolve_path(relative_path: str) -> Path:
    """逻辑路径 -> 本地可读路径。对象存储模式下会自动缓存到临时目录。"""
    try:
        return _backend().resolve_path(relative_path)
    except (BotoCoreError, ClientError) as exc:
        raise ValueError(f"无法从对象存储读取文件: {exc}") from exc


def get_full_path(relative_path: str) -> Path:
    """同 resolve_path。"""
    return resolve_path(relative_path)


def storage_path_exists(relative_path: str) -> bool:
    try:
        return _backend().exists(relative_path)
    except (BotoCoreError, ClientError, RuntimeError, ValueError):
        return False


def storage_healthcheck() -> bool:
    """检查存储后端是否可用。"""
    try:
        return _backend().healthcheck()
    except (BotoCoreError, ClientError, OSError, RuntimeError, ValueError):
        return False
