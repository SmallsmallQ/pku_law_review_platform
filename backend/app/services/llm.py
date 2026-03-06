"""
阿里云百炼（OpenAI 兼容）大模型调用。
使用 DASHSCOPE_API_KEY、LLM_BASE_URL、LLM_MODEL 环境变量，见 .env.example。
"""
from openai import OpenAI

from app.config import settings


# 请求超时（秒），避免长时间无响应
LLM_REQUEST_TIMEOUT = 90
PLACEHOLDER_API_KEYS = {
    "your-dashscope-api-key",
    "your_api_key",
    "changeme",
}


def _normalized_api_key() -> str:
    """读取并标准化 API Key，过滤常见占位符值。"""
    key = (getattr(settings, "dashscope_api_key", None) or "").strip()
    if not key:
        return ""
    if key.lower() in PLACEHOLDER_API_KEYS:
        return ""
    return key


def _client() -> OpenAI | None:
    """返回配置好的 OpenAI 兼容客户端；未配置 API Key 时返回 None。"""
    api_key = _normalized_api_key()
    if not api_key:
        return None
    return OpenAI(
        api_key=api_key,
        base_url=settings.llm_base_url.strip() or "https://dashscope.aliyuncs.com/compatible-mode/v1",
        timeout=LLM_REQUEST_TIMEOUT,
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
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
        )
    except Exception as e:
        err_msg = str(e).strip() or "大模型调用异常"
        if "timeout" in err_msg.lower() or "timed out" in err_msg.lower():
            raise ValueError("请求超时，请稍后重试") from e
        raise ValueError(err_msg) from e
    choice = completion.choices[0] if completion.choices else None
    if not choice or not choice.message:
        return ""
    return (choice.message.content or "").strip()


def is_llm_configured() -> bool:
    """是否已配置百炼 API Key（可用于前端判断是否展示 AI 能力）。"""
    return bool(_normalized_api_key())
