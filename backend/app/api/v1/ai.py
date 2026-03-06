"""
AI 能力：百炼大模型对话、后续可扩展初审报告生成等。
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.deps import RequireEditor, get_current_user
from app.models import User
from app.services.llm import chat_completion, is_llm_configured

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # user | system | assistant
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str | None = None
    max_tokens: int = 2048


class ChatResponse(BaseModel):
    content: str
    model: str


@router.get("/status")
def ai_status(
    user: Annotated[User, Depends(get_current_user)],
):
    """是否已配置大模型（用于前端展示/隐藏 AI 能力）。登录即可查。"""
    return {"configured": is_llm_configured()}


@router.post("/chat", response_model=ChatResponse)
def ai_chat(
    body: ChatRequest,
    user: Annotated[User, Depends(RequireEditor)],
):
    """编辑端：调用百炼大模型对话，用于问答、摘要、初审建议等。"""
    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="未配置大模型（请在后端 .env 中设置 DASHSCOPE_API_KEY）",
        )
    msgs = [{"role": m.role, "content": m.content} for m in body.messages]
    if not msgs:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="messages 不能为空")
    try:
        content = chat_completion(msgs, model=body.model, max_tokens=body.max_tokens)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"大模型调用失败: {e!s}",
        )
    from app.config import settings
    return ChatResponse(content=content, model=body.model or settings.llm_model)
