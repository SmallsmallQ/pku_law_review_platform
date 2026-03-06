"""
SQLAlchemy 声明基类与表结构创建。初版同步引擎。
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
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
