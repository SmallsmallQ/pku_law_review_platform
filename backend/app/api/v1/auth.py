"""
认证：注册、登录、登出、当前用户。见 docs/api-spec.md。
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.base import get_db
from app.models import User

router = APIRouter()


class RegisterBody(BaseModel):
    email: EmailStr
    password: str
    real_name: str | None = None
    institution: str | None = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    real_name: str | None
    role: str
    institution: str | None
    name_en_first: str | None = None
    name_en_middle: str | None = None
    name_en_last: str | None = None
    salutation: str | None = None
    ethnicity: str | None = None
    phone: str | None = None
    postal_address: str | None = None
    postal_code: str | None = None
    research_field: str | None = None
    title_zh: str | None = None
    title_en: str | None = None

    class Config:
        from_attributes = True


class UpdateMeBody(BaseModel):
    real_name: str | None = None
    institution: str | None = None
    name_en_first: str | None = None
    name_en_middle: str | None = None
    name_en_last: str | None = None
    salutation: str | None = None
    ethnicity: str | None = None
    phone: str | None = None
    postal_address: str | None = None
    postal_code: str | None = None
    research_field: str | None = None
    title_zh: str | None = None
    title_en: str | None = None


def _user_to_response(u: User) -> UserResponse:
    return UserResponse(
        id=u.id,
        email=u.email,
        real_name=u.real_name,
        role=u.role,
        institution=u.institution,
        name_en_first=getattr(u, "name_en_first", None),
        name_en_middle=getattr(u, "name_en_middle", None),
        name_en_last=getattr(u, "name_en_last", None),
        salutation=getattr(u, "salutation", None),
        ethnicity=getattr(u, "ethnicity", None),
        phone=getattr(u, "phone", None),
        postal_address=getattr(u, "postal_address", None),
        postal_code=getattr(u, "postal_code", None),
        research_field=getattr(u, "research_field", None),
        title_zh=getattr(u, "title_zh", None),
        title_en=getattr(u, "title_en", None),
    )


def _assign_user_id_for_sqlite(db: Session, user: User) -> None:
    """SQLite 下 BIGINT 主键不会自增，这里手动分配。"""
    if db.bind is not None and db.bind.dialect.name == "sqlite":
        user.id = (db.query(func.max(User.id)).scalar() or 0) + 1


@router.post("/register", response_model=UserResponse)
def register(body: RegisterBody, db: Session = Depends(get_db)):
    """作者注册。"""
    email = str(body.email).strip().lower()
    if len(body.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="密码至少 8 位")
    if not any(ch.isalpha() for ch in body.password) or not any(ch.isdigit() for ch in body.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="密码需包含字母和数字")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已注册")
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        real_name=body.real_name.strip() if body.real_name else None,
        institution=body.institution.strip() if body.institution else None,
        role="author",
    )
    _assign_user_id_for_sqlite(db, user)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_to_response(user)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginBody, db: Session = Depends(get_db)):
    """登录，返回 JWT。"""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已停用")
    token = create_access_token(user.id, extra={"role": user.role})
    return TokenResponse(access_token=token)


@router.post("/logout")
def logout():
    """登出。JWT 无状态时为空实现。"""
    return {"message": "ok"}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    """当前用户。"""
    return _user_to_response(user)


def _strip(s: str | None) -> str | None:
    return s.strip() if s and s.strip() else None


@router.put("/me", response_model=UserResponse)
def update_me(body: UpdateMeBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """更新当前用户个人信息（含姓名、单位、通信、职务职称等）。"""
    user.real_name = _strip(body.real_name) if body.real_name is not None else user.real_name
    user.institution = _strip(body.institution) if body.institution is not None else user.institution
    for key in ("name_en_first", "name_en_middle", "name_en_last", "salutation", "ethnicity",
                "phone", "postal_address", "postal_code", "research_field", "title_zh", "title_en"):
        if hasattr(user, key):
            setattr(user, key, _strip(getattr(body, key)))
    db.commit()
    db.refresh(user)
    return _user_to_response(user)
