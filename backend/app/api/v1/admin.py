"""
管理员端：用户、栏目、退修模板、配置、统计。仅 admin 角色。见 docs/api-spec.md。
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import RequireAdmin, get_db
from app.core.security import hash_password
from app.models import Manuscript, RevisionTemplate, Section, SystemConfig, User

router = APIRouter()


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


@router.get("/users", response_model=dict)
def list_users(
    user: User = Depends(RequireAdmin),
    db: Session = Depends(get_db),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
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
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已存在")
    if body.role not in ("author", "editor", "admin"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色须为 author / editor / admin")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        real_name=body.real_name,
        role=body.role,
    )
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
    _user: User = Depends(RequireAdmin),
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
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
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
    section = Section(name=body.name, code=body.code, sort_order=body.sort_order)
    db.add(section)
    db.commit()
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
    section.name = body.name
    section.code = body.code
    section.sort_order = body.sort_order
    db.commit()
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
    if body.items:
        for item in body.items:
            k = item.get("key")
            v = item.get("value")
            if k is None:
                continue
            row = db.query(SystemConfig).filter(SystemConfig.key == k).first()
            if row:
                row.value = v
            else:
                db.add(SystemConfig(key=k, value=v))
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
