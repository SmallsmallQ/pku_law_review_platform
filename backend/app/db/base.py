"""
SQLAlchemy 声明基类与数据库连接。
"""
from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings


def _normalize_sync_database_url(raw_url: str) -> str:
    sync_url = raw_url
    if sync_url.startswith("sqlite:///") and not sync_url.startswith("sqlite:////"):
        sqlite_path = sync_url[len("sqlite:///") :]
        if sqlite_path and sqlite_path != ":memory:" and not Path(sqlite_path).is_absolute():
            backend_root = Path(__file__).resolve().parent.parent.parent
            sqlite_abs = (backend_root / sqlite_path).resolve().as_posix()
            sync_url = f"sqlite:///{sqlite_abs}"
    return sync_url


_sync_url = _normalize_sync_database_url(settings.sync_database_url)
_connect_args = {"check_same_thread": False} if _sync_url.startswith("sqlite") else {}

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


def db_healthcheck() -> bool:
    """执行最小化连通性检查，供 readiness probe 使用。"""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    rows = conn.execute(text(f'PRAGMA table_info("{table_name}")')).mappings().all()
    return any(str(r.get("name", "")).lower() == column_name.lower() for r in rows)


def _apply_sqlite_compat_migrations() -> None:
    if settings.is_production or engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        background_jobs = Base.metadata.tables.get("background_jobs")
        if background_jobs is not None:
            background_jobs.create(bind=conn, checkfirst=True)
        if not _column_exists(conn, "manuscripts", "current_review_stage"):
            conn.execute(text('ALTER TABLE manuscripts ADD COLUMN current_review_stage VARCHAR(20)'))
        if _column_exists(conn, "manuscripts", "status"):
            conn.execute(
                text(
                    """
                    UPDATE manuscripts
                    SET current_review_stage = CASE
                        WHEN current_review_stage IS NOT NULL THEN current_review_stage
                        WHEN status IN ('under_review', 'internal_review') THEN 'internal'
                        WHEN status = 'external_review' THEN 'external'
                        WHEN status = 'final_review' THEN 'final'
                        ELSE current_review_stage
                    END
                    """
                )
            )


def init_db():
    """创建所有表（开发/测试用；生产建议用 Alembic 迁移）。"""
    if settings.is_production:
        raise RuntimeError("生产环境禁止调用 init_db()，请使用 Alembic 迁移。")
    import app.models  # noqa: F401 — 注册所有表
    Base.metadata.create_all(bind=engine)
    _apply_sqlite_compat_migrations()
