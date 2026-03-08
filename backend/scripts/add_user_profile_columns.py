"""
为 users 表添加个人信息字段（用于已有数据库升级）。
用法：在 backend 目录下执行
  python -m scripts.add_user_profile_columns
仅对 SQLite 有效；PostgreSQL 等可依赖 Alembic 或手动 ALTER TABLE。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.base import engine

NEW_COLUMNS = [
    ("name_en_first", "VARCHAR(50)"),
    ("name_en_middle", "VARCHAR(50)"),
    ("name_en_last", "VARCHAR(50)"),
    ("salutation", "VARCHAR(20)"),
    ("ethnicity", "VARCHAR(20)"),
    ("phone", "VARCHAR(30)"),
    ("postal_address", "VARCHAR(300)"),
    ("postal_code", "VARCHAR(20)"),
    ("research_field", "VARCHAR(200)"),
    ("title_zh", "VARCHAR(50)"),
    ("title_en", "VARCHAR(50)"),
]

if __name__ == "__main__":
    if "sqlite" not in str(engine.url):
        print("Not SQLite, skip. Run ALTER TABLE manually if needed.")
        sys.exit(0)
    with engine.connect() as conn:
        r = conn.execute(text('PRAGMA table_info("users")'))
        existing = {row[1] for row in r}
    for col, typ in NEW_COLUMNS:
        if col in existing:
            print(f"Column users.{col} already exists, skip.")
            continue
        with engine.connect() as c:
            with c.begin():
                c.execute(text(f'ALTER TABLE users ADD COLUMN "{col}" {typ}'))
        print(f"Added users.{col}")
    print("Done.")
