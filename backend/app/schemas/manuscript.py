"""稿件相关请求/响应模型。"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.job import BackgroundJobResponse


class ManuscriptCreateForm(BaseModel):
    """POST /manuscripts 表单字段（与 multipart 一起传）。"""
    title: str
    abstract: str = ""
    keywords: str = ""
    author_info: str = "{}"  # JSON 字符串
    institution: str = ""
    fund: str = ""
    contact: str = ""
    section_id: int | None = None
    submit: bool = False  # true 表示直接投稿，否则为草稿


class ManuscriptListItem(BaseModel):
    id: int
    manuscript_no: str
    title: str
    status: str
    current_version_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class AccessibleManuscriptListItem(ManuscriptListItem):
    access_mode: str


class ManuscriptVersionBrief(BaseModel):
    id: int
    version_number: int
    file_name_original: str | None
    word_count: int | None
    parsed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class ManuscriptDetailResponse(BaseModel):
    id: int
    manuscript_no: str
    title: str
    status: str
    submitted_by: int
    section_id: int | None
    current_version_id: int | None
    created_at: datetime
    updated_at: datetime
    current_version: ManuscriptVersionBrief | None = None
    # 解析摘要、报告摘要后续在解析/报告接入后填充


class ManuscriptCreateResponse(BaseModel):
    manuscript: ManuscriptDetailResponse
    version: ManuscriptVersionBrief
    parse_job: BackgroundJobResponse | None = None


class ManuscriptRevisionUploadResponse(BaseModel):
    version: ManuscriptVersionBrief
    parse_job: BackgroundJobResponse | None = None


class RevisionRequestItem(BaseModel):
    id: int
    action_type: str
    comment: str | None
    created_at: datetime

    class Config:
        from_attributes = True
