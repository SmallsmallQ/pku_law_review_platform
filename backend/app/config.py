"""
应用配置。从环境变量读取，便于本地与生产环境保持一致。
"""
from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "test", "production"]
StorageType = Literal["local", "minio", "s3"]

DEFAULT_SQLITE_PATH = (Path(__file__).resolve().parent.parent / "law_review.db").as_posix()
BACKEND_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ENV_PATH = BACKEND_ROOT / ".env"
DEFAULT_LOCAL_ENV_PATH = BACKEND_ROOT / ".env.local"
DEFAULT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    """全局配置（可从 .env 覆盖）。"""

    model_config = SettingsConfigDict(
        env_file=(str(DEFAULT_ENV_PATH), str(DEFAULT_LOCAL_ENV_PATH)),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "中外法学智能编审系统"
    environment: Environment = "development"
    debug: bool = False

    # 数据库
    database_url: str = f"sqlite:///{DEFAULT_SQLITE_PATH}"
    use_sqlite: bool = False

    # 认证（JWT）
    secret_key: str = DEFAULT_SECRET
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # 文件存储
    storage_type: StorageType = "local"
    storage_local_path: str = "./storage"
    storage_bucket: str = "law-review-platform"
    storage_region: str = ""
    storage_endpoint: str = ""
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_secure: bool = True

    # 跨域
    cors_origins: list[str] = ["http://localhost:3000"]

    # 阿里云百炼（OpenAI 兼容接口）
    dashscope_api_key: str = ""
    llm_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    llm_model: str = "qwen3.5-plus"

    # 启动时是否创建表（开发/测试用；生产请走 Alembic）
    init_db_on_startup: bool = False
    job_worker_poll_seconds: int = 3
    job_worker_batch_size: int = 5
    job_max_attempts: int = 3

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def uses_sqlite(self) -> bool:
        return self.use_sqlite or self.database_url.startswith("sqlite")

    @property
    def effective_database_url(self) -> str:
        if self.use_sqlite:
            if self.is_production:
                raise ValueError("生产环境禁止启用 USE_SQLITE。请配置 PostgreSQL DATABASE_URL。")
            if self.database_url.startswith("sqlite"):
                return self.database_url
            return f"sqlite:///{DEFAULT_SQLITE_PATH}"
        return self.database_url

    @property
    def sync_database_url(self) -> str:
        sync_url = self.effective_database_url
        if "+asyncpg" in sync_url:
            return sync_url.replace("postgresql+asyncpg", "postgresql", 1)
        return sync_url

    @model_validator(mode="after")
    def validate_runtime_requirements(self) -> "Settings":
        if self.is_production:
            if self.debug:
                raise ValueError("生产环境请关闭 DEBUG。")
            if self.secret_key == DEFAULT_SECRET:
                raise ValueError("生产环境必须配置强随机 SECRET_KEY。")
            if self.use_sqlite or self.database_url.startswith("sqlite"):
                raise ValueError("生产环境必须使用 PostgreSQL，禁止 SQLite fallback。")
            if not self.database_url.startswith(("postgresql://", "postgresql+psycopg2://", "postgresql+asyncpg://")):
                raise ValueError("生产环境 DATABASE_URL 必须为 PostgreSQL 连接串。")
            if self.init_db_on_startup:
                raise ValueError("生产环境禁止 INIT_DB_ON_STARTUP=true，请通过 Alembic 管理迁移。")

        if self.storage_type in {"minio", "s3"}:
            missing = [
                name
                for name, value in (
                    ("STORAGE_BUCKET", self.storage_bucket),
                    ("STORAGE_ACCESS_KEY", self.storage_access_key),
                    ("STORAGE_SECRET_KEY", self.storage_secret_key),
                )
                if not value
            ]
            if missing:
                missing_text = ", ".join(missing)
                raise ValueError(f"{self.storage_type} 存储缺少必要配置: {missing_text}")
            if self.storage_type == "minio" and not self.storage_endpoint:
                raise ValueError("MinIO 模式必须配置 STORAGE_ENDPOINT。")

        return self


settings = Settings()
