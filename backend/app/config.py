"""
应用配置。从环境变量读取，便于本地与部署一致。
"""
from pathlib import Path

from pydantic_settings import BaseSettings

DEFAULT_SQLITE_PATH = (Path(__file__).resolve().parent.parent / "law_review.db").as_posix()


class Settings(BaseSettings):
    """全局配置（可从 .env 覆盖）。"""

    app_name: str = "中外法学智能编审系统"
    debug: bool = False

    # 数据库。默认 SQLite 便于本地无 PostgreSQL 时直接跑通；生产请设 DATABASE_URL 为 PostgreSQL
    database_url: str = f"sqlite:///{DEFAULT_SQLITE_PATH}"
    # 设为 true 时强制使用 SQLite（忽略 DATABASE_URL），便于本地未启 PostgreSQL 时跑通
    use_sqlite: bool = False

    # 认证（初版 JWT）
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 天

    # 文件存储（初版可指向本地目录）
    storage_type: str = "local"  # local | minio
    storage_local_path: str = "./storage"
    # minio_endpoint: str = "localhost:9000"
    # minio_access_key: str = ""
    # minio_secret_key: str = ""
    # minio_bucket: str = "manuscripts"

    # 跨域（前端地址）
    cors_origins: list[str] = ["http://localhost:3000"]

    # 阿里云百炼（OpenAI 兼容接口）
    # 华北2（北京）: https://dashscope.aliyuncs.com/compatible-mode/v1
    # 新加坡: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    dashscope_api_key: str = ""
    llm_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    llm_model: str = "qwen3.5-plus"  # 可选: qwen3-max-2026-01-23, qwen3-coder-next, kimi-k2.5 等

    # 启动时是否创建表（开发用；生产建议用 Alembic）
    init_db_on_startup: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
