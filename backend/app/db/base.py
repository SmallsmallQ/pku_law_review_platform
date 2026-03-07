"""
SQLAlchemy 声明基类与表结构创建。初版同步引擎（需 psycopg2，勿用 asyncpg）。
"""
from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

# 同步脚本与 Session 必须用同步驱动；若 DATABASE_URL 为 postgresql+asyncpg 则改为 postgresql（psycopg2）
if getattr(settings, "use_sqlite", False):
    if str(settings.database_url).startswith("sqlite"):
        _sync_url = settings.database_url
    else:
        fallback_sqlite_path = (Path(__file__).resolve().parent.parent.parent / "law_review.db").as_posix()
        _sync_url = f"sqlite:///{fallback_sqlite_path}"
else:
    _sync_url = settings.database_url
if "+asyncpg" in _sync_url:
    _sync_url = _sync_url.replace("postgresql+asyncpg", "postgresql", 1)

# 兼容相对 SQLite 路径：统一转为 backend 目录下的绝对路径，避免不同启动目录连错库。
if _sync_url.startswith("sqlite:///") and not _sync_url.startswith("sqlite:////"):
    sqlite_path = _sync_url[len("sqlite:///") :]
    if sqlite_path and sqlite_path != ":memory:" and not Path(sqlite_path).is_absolute():
        backend_root = Path(__file__).resolve().parent.parent.parent
        sqlite_abs = (backend_root / sqlite_path).resolve().as_posix()
        _sync_url = f"sqlite:///{sqlite_abs}"

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
_sqlite_bigint_pk_cache: dict[str, bool] = {}


def _sqlite_table_has_bigint_pk(conn, table_name: str) -> bool:
    """兼容旧 SQLite 表结构：BIGINT PRIMARY KEY 不会自动生成 id。"""
    if table_name in _sqlite_bigint_pk_cache:
        return _sqlite_bigint_pk_cache[table_name]
    rows = conn.execute(text(f'PRAGMA table_info("{table_name}")')).mappings().all()
    needs_manual = any(
        str(r.get("name", "")).lower() == "id"
        and int(r.get("pk", 0)) == 1
        and "BIGINT" in str(r.get("type", "")).upper()
        for r in rows
    )
    _sqlite_bigint_pk_cache[table_name] = needs_manual
    return needs_manual


@event.listens_for(SessionLocal, "before_flush")
def _assign_sqlite_legacy_ids(session, flush_context, instances):
    """
    为旧 SQLite BIGINT 主键表补发 id，避免 NOT NULL constraint failed: <table>.id。
    新建数据库使用 IDType 后不会触发此逻辑。
    """
    bind = session.get_bind()
    if bind is None or bind.dialect.name != "sqlite":
        return
    conn = session.connection()
    counters: dict[str, int] = {}
    for obj in session.new:
        obj_id = getattr(obj, "id", None)
        if obj_id is not None:
            continue
        mapper = inspect(obj).mapper
        if "id" not in mapper.columns:
            continue
        table_name = mapper.local_table.name
        if not _sqlite_table_has_bigint_pk(conn, table_name):
            continue
        if table_name not in counters:
            current_max = conn.execute(text(f'SELECT COALESCE(MAX(id), 0) FROM "{table_name}"')).scalar_one()
            counters[table_name] = int(current_max or 0)
        counters[table_name] += 1
        setattr(obj, "id", counters[table_name])


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
