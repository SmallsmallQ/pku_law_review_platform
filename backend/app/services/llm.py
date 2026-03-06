"""
阿里云百炼（OpenAI 兼容）大模型调用。
使用 DASHSCOPE_API_KEY、LLM_BASE_URL、LLM_MODEL 环境变量，见 .env.example。
"""
from openai import OpenAI

from app.config import settings


def _client() -> OpenAI | None:
    """返回配置好的 OpenAI 兼容客户端；未配置 API Key 时返回 None。"""
    if not (getattr(settings, "dashscope_api_key", None) or "").strip():
        return None
    return OpenAI(
        api_key=settings.dashscope_api_key.strip(),
        base_url=settings.llm_base_url.strip() or "https://dashscope.aliyuncs.com/compatible-mode/v1",
    )


def chat_completion(
    messages: list[dict[str, str]],
    model: str | None = None,
    max_tokens: int = 2048,
) -> str:
    """
    调用百炼对话接口，返回助手回复文本。
    messages 格式: [{"role": "user"|"system"|"assistant", "content": "..."}]
    未配置 DASHSCOPE_API_KEY 时抛出 ValueError。
    """
    client = _client()
    if client is None:
        raise ValueError("未配置 DASHSCOPE_API_KEY，请在 .env 中设置阿里云百炼 API Key")
    model = (model or "").strip() or settings.llm_model
    completion = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
    )
    choice = completion.choices[0] if completion.choices else None
    if not choice or not choice.message:
        return ""
    return (choice.message.content or "").strip()


def is_llm_configured() -> bool:
    """是否已配置百炼 API Key（可用于前端判断是否展示 AI 能力）。"""
    return bool((getattr(settings, "dashscope_api_key", None) or "").strip())
