from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.types import IDType


class User(Base):
    __tablename__ = "users"

    id = Column(IDType, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    real_name = Column(String(100))
    role = Column(String(20), nullable=False, index=True)  # author | editor | admin
    institution = Column(String(200))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    # 个人信息扩展
    name_en_first = Column(String(50))
    name_en_middle = Column(String(50))
    name_en_last = Column(String(50))
    salutation = Column(String(20))   # 称呼
    ethnicity = Column(String(20))    # 民族
    phone = Column(String(30))
    postal_address = Column(String(300))
    postal_code = Column(String(20))
    research_field = Column(String(200))
    title_zh = Column(String(50))     # 职务
    title_en = Column(String(50))     # 职称
