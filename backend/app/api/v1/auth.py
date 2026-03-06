"""
认证：注册、登录、登出、当前用户。见 docs/api-spec.md。
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
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

    class Config:
        from_attributes = True


class UpdateMeBody(BaseModel):
    real_name: str | None = None
    institution: str | None = None


def _user_to_response(u: User) -> UserResponse:
    return UserResponse(id=u.id, email=u.email, real_name=u.real_name, role=u.role, institution=u.institution)


@router.post("/register", response_model=UserResponse)
def register(body: RegisterBody, db: Session = Depends(get_db)):
    """作者注册。"""
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已注册")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        real_name=body.real_name,
        institution=body.institution,
        role="author",
    )
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


@router.put("/me", response_model=UserResponse)
def update_me(body: UpdateMeBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """更新当前用户信息（仅 real_name、institution）。"""
    if body.real_name is not None:
        user.real_name = body.real_name
    if body.institution is not None:
        user.institution = body.institution
    db.commit()
    db.refresh(user)
    return _user_to_response(user)
