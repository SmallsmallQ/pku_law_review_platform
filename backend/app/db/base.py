"""
SQLAlchemy 声明基类与表结构创建。初版同步引擎（需 psycopg2，勿用 asyncpg）。
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

# 同步脚本与 Session 必须用同步驱动；若 DATABASE_URL 为 postgresql+asyncpg 则改为 postgresql（psycopg2）
_sync_url = "sqlite:///./law_review.db" if getattr(settings, "use_sqlite", False) else settings.database_url
if "+asyncpg" in _sync_url:
    _sync_url = _sync_url.replace("postgresql+asyncpg", "postgresql", 1)

_connect_args = {}
if _sync_url.startswith("sqlite"):
    _connect_args["check_same_thread"] = False

engine = create_engine(
    _sync_url,
    connect_args=_connect_args,
    pool_pre_ping=not _sync_url.startswith("sqlite"),
    echo=settings.debug,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """依赖注入：请求内 DB Session。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """创建所有表（开发/测试用；生产建议用 Alembic 迁移）。"""
    import app.models  # noqa: F401 — 注册所有表
    Base.metadata.create_all(bind=engine)
