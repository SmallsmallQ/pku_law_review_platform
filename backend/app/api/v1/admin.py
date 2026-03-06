"""
管理员端：用户、栏目、退修模板、配置、统计。仅 admin 角色。见 docs/api-spec.md。
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import RequireAdmin, get_db
from app.core.security import hash_password
from app.models import Manuscript, RevisionTemplate, Section, SystemConfig, User

router = APIRouter()


def _assign_user_id_for_sqlite(db: Session, user: User) -> None:
    """SQLite 下 BIGINT 主键不会自增，这里手动分配。"""
    if db.bind is not None and db.bind.dialect.name == "sqlite":
        user.id = (db.query(func.max(User.id)).scalar() or 0) + 1


def _validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="密码至少 8 位")
    if not any(ch.isalpha() for ch in password) or not any(ch.isdigit() for ch in password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="密码需包含字母和数字")


# ----- Users -----
class AdminUserItem(BaseModel):
    id: int
    email: str
    real_name: str | None
    role: str
    institution: str | None
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class CreateUserBody(BaseModel):
    email: EmailStr
    password: str
    real_name: str | None = None
    role: str = "author"


class UpdateUserBody(BaseModel):
    real_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None


@router.get("/users", response_model=dict)
def list_users(
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    keyword: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    if keyword:
        k = f"%{keyword.strip().lower()}%"
        q = q.filter(
            or_(
                func.lower(User.email).like(k),
                func.lower(func.coalesce(User.real_name, "")).like(k),
            )
        )
    total = q.count()
    items = q.order_by(User.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [
            AdminUserItem(
                id=u.id,
                email=u.email,
                real_name=u.real_name,
                role=u.role,
                institution=u.institution,
                is_active=u.is_active,
                created_at=u.created_at.isoformat() if u.created_at else "",
            )
            for u in items
        ],
        "total": total,
    }


@router.post("/users", response_model=AdminUserItem)
def create_user(
    body: CreateUserBody,
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    email = str(body.email).strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已存在")
    if body.role not in ("author", "editor", "admin"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色须为 author / editor / admin")
    _validate_password(body.password)
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        real_name=body.real_name,
        role=body.role,
    )
    _assign_user_id_for_sqlite(db, user)
    db.add(user)
    db.commit()
    db.refresh(user)
    return AdminUserItem(
        id=user.id,
        email=user.email,
        real_name=user.real_name,
        role=user.role,
        institution=user.institution,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


@router.put("/users/{user_id}", response_model=AdminUserItem)
def update_user(
    user_id: int,
    body: UpdateUserBody,
    current_user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    if body.real_name is not None:
        user.real_name = body.real_name
    if body.role is not None:
        if body.role not in ("author", "editor", "admin"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色须为 author / editor / admin")
        if user.id == current_user.id and body.role != "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能将当前管理员账号降级")
        user.role = body.role
    if body.is_active is not None:
        if user.id == current_user.id and body.is_active is False:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能停用当前登录账号")
        user.is_active = body.is_active
    if body.password is not None:
        _validate_password(body.password)
        user.password_hash = hash_password(body.password)
    db.commit()
    db.refresh(user)
    return AdminUserItem(
        id=user.id,
        email=user.email,
        real_name=user.real_name,
        role=user.role,
        institution=user.institution,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


# ----- Sections -----
class SectionItem(BaseModel):
    id: int
    name: str
    code: str | None
    sort_order: int
    created_at: str | None

    class Config:
        from_attributes = True


class SectionBody(BaseModel):
    name: str
    code: str | None = None
    sort_order: int = 0


@router.get("/sections", response_model=dict)
def list_sections(
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    items = db.query(Section).order_by(Section.sort_order, Section.id).all()
    return {
        "items": [
            SectionItem(
                id=s.id,
                name=s.name,
                code=s.code,
                sort_order=s.sort_order,
                created_at=s.created_at.isoformat() if s.created_at else None,
            )
            for s in items
        ],
        "total": len(items),
    }


@router.post("/sections", response_model=SectionItem)
def create_section(
    body: SectionBody,
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    code = body.code.strip() if body.code else None
    if code and db.query(Section).filter(Section.code == code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="栏目编码已存在")
    section = Section(name=body.name.strip(), code=code, sort_order=body.sort_order)
    db.add(section)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="栏目编码已存在")
    db.refresh(section)
    return SectionItem(
        id=section.id,
        name=section.name,
        code=section.code,
        sort_order=section.sort_order,
        created_at=section.created_at.isoformat() if section.created_at else None,
    )


@router.put("/sections/{section_id}", response_model=SectionItem)
def update_section(
    section_id: int,
    body: SectionBody,
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="栏目不存在")
    code = body.code.strip() if body.code else None
    if code:
        exists = db.query(Section).filter(Section.code == code, Section.id != section_id).first()
        if exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="栏目编码已存在")
    section.name = body.name.strip()
    section.code = code
    section.sort_order = body.sort_order
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="栏目编码已存在")
    db.refresh(section)
    return SectionItem(
        id=section.id,
        name=section.name,
        code=section.code,
        sort_order=section.sort_order,
        created_at=section.created_at.isoformat() if section.created_at else None,
    )


@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(
    section_id: int,
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="栏目不存在")
    has_manuscripts = db.query(Manuscript.id).filter(Manuscript.section_id == section_id).first() is not None
    if has_manuscripts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该栏目已被稿件引用，不能删除")
    db.delete(section)
    db.commit()


# ----- Revision templates -----
class RevisionTemplateItem(BaseModel):
    id: int
    name: str | None
    content: str | None
    is_active: bool
    created_at: str | None

    class Config:
        from_attributes = True


class RevisionTemplateBody(BaseModel):
    name: str | None = None
    content: str | None = None
    is_active: bool | None = None


@router.get("/templates/revision", response_model=dict)
def list_revision_templates(
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    items = db.query(RevisionTemplate).order_by(RevisionTemplate.id).all()
    return {
        "items": [
            RevisionTemplateItem(
                id=t.id,
                name=t.name,
                content=t.content,
                is_active=t.is_active,
                created_at=t.created_at.isoformat() if t.created_at else None,
            )
            for t in items
        ],
        "total": len(items),
    }


@router.post("/templates/revision", response_model=RevisionTemplateItem)
def create_revision_template(
    body: RevisionTemplateBody,
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    t = RevisionTemplate(name=body.name, content=body.content or "", is_active=body.is_active if body.is_active is not None else True)
    db.add(t)
    db.commit()
    db.refresh(t)
    return RevisionTemplateItem(
        id=t.id,
        name=t.name,
        content=t.content,
        is_active=t.is_active,
        created_at=t.created_at.isoformat() if t.created_at else None,
    )


@router.put("/templates/revision/{template_id}", response_model=RevisionTemplateItem)
def update_revision_template(
    template_id: int,
    body: RevisionTemplateBody,
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    t = db.query(RevisionTemplate).filter(RevisionTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模板不存在")
    if body.name is not None:
        t.name = body.name
    if body.content is not None:
        t.content = body.content
    if body.is_active is not None:
        t.is_active = body.is_active
    db.commit()
    db.refresh(t)
    return RevisionTemplateItem(
        id=t.id,
        name=t.name,
        content=t.content,
        is_active=t.is_active,
        created_at=t.created_at.isoformat() if t.created_at else None,
    )


@router.delete("/templates/revision/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_revision_template(
    template_id: int,
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    t = db.query(RevisionTemplate).filter(RevisionTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模板不存在")
    db.delete(t)
    db.commit()


# ----- Config -----
class ConfigItem(BaseModel):
    key: str
    value: str | None
    updated_at: str | None


class ConfigUpdateBody(BaseModel):
    key: str | None = None
    value: str | None = None
    items: list[dict] | None = None  # [{ "key": "k", "value": "v" }] 批量


@router.get("/config", response_model=dict)
def get_config(
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    rows = db.query(SystemConfig).all()
    return {
        "items": [
            ConfigItem(key=r.key, value=r.value, updated_at=r.updated_at.isoformat() if r.updated_at else None)
            for r in rows
        ],
        "total": len(rows),
    }


@router.put("/config", response_model=dict)
def update_config(
    body: ConfigUpdateBody,
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    if body.items is not None:
        seen_keys: set[str] = set()
        for item in body.items:
            k = item.get("key")
            v = item.get("value")
            if k is None:
                continue
            key = str(k).strip()
            if not key:
                continue
            seen_keys.add(key)
            row = db.query(SystemConfig).filter(SystemConfig.key == key).first()
            if row:
                row.value = v
            else:
                db.add(SystemConfig(key=key, value=v))
        db.query(SystemConfig).filter(~SystemConfig.key.in_(seen_keys)).delete(synchronize_session=False)
        db.commit()
    elif body.key is not None:
        row = db.query(SystemConfig).filter(SystemConfig.key == body.key).first()
        if row:
            row.value = body.value
        else:
            db.add(SystemConfig(key=body.key, value=body.value or ""))
        db.commit()
    return {"message": "ok"}


# ----- Stats -----
@router.get("/stats", response_model=dict)
def get_stats(
    _user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
):
    total_manuscripts = db.query(Manuscript).count()
    by_status = db.query(Manuscript.status, func.count(Manuscript.id)).group_by(Manuscript.status).all()
    status_counts = {s: c for s, c in by_status}
    # 待处理：submitted, parsing, under_review, revision_requested, revised_submitted
    pending_statuses = ("submitted", "parsing", "under_review", "revision_requested", "revised_submitted")
    pending = sum(status_counts.get(s, 0) for s in pending_statuses)
    user_counts = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    users_by_role = {r: c for r, c in user_counts}
    return {
        "manuscripts_total": total_manuscripts,
        "manuscripts_by_status": status_counts,
        "manuscripts_pending": pending,
        "users_by_role": users_by_role,
        "sections_count": db.query(Section).count(),
        "templates_count": db.query(RevisionTemplate).count(),
    }
