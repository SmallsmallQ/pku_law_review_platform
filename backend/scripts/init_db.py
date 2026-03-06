"""
创建数据库表（与 docs/database-schema.md 一致）。
用法：在 backend 目录下执行
  python -m scripts.init_db
可选环境变量：SEED_EDITOR_EMAIL=editor@test.com SEED_EDITOR_PASSWORD=xxx 会创建一名编辑账号。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.db.base import Base, engine, init_db

if __name__ == "__main__":
    init_db()
    print("Tables created.")

    email = os.environ.get("SEED_EDITOR_EMAIL")
    password = os.environ.get("SEED_EDITOR_PASSWORD")
    if email and password:
        from app.core.security import hash_password
        from app.models import User
        from app.db.base import SessionLocal

        db = SessionLocal()
        try:
            if db.query(User).filter(User.email == email).first():
                print(f"User {email} already exists.")
            else:
                u = User(
                    email=email,
                    password_hash=hash_password(password),
                    real_name="测试编辑",
                    role="editor",
                )
                db.add(u)
                db.commit()
                print(f"Created editor: {email}")
        finally:
            db.close()
