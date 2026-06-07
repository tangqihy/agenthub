import time
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.deps import get_state
from app.models.domain import ChatMessage
from app.runtime import ChatRuntimeError, ChatRuntimeNotConfigured, OpenAICompatibleChatRuntime
from app.security import require_auth

router = APIRouter(
    prefix="/api/v2/agents",
    tags=["chat"],
    dependencies=[Depends(require_auth)],
)


def _new_id(prefix: str = "msg") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None  # None = new conversation


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    user_message_id: str
    assistant_message_id: str


class RuntimeStatus(BaseModel):
    configured: bool
    provider: str
    model: str


def _build_system_prompt(agent) -> str:
    parts = [f"You are {agent.name}."]
    if agent.description:
        parts.append(agent.description)
    return "\n".join(parts)


@router.get("/runtime/status", response_model=RuntimeStatus)
async def runtime_status():
    return RuntimeStatus(
        configured=bool(settings.llm_base_url and settings.llm_api_key and settings.llm_model),
        provider="openai-compatible",
        model=settings.llm_model,
    )


@router.post("/{agent_id}/chat", response_model=ChatResponse)
async def send_message(agent_id: str, body: ChatRequest, state=Depends(get_state)):
    agent = await state.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    # Get agent config for system prompt
    current_version = await state.agents.get_version(agent_id, agent.current_version)
    config = current_version.config_json if current_version else {}

    # Build system prompt from agent config
    system_prompt = config.get("prompt", "") or _build_system_prompt(agent)
    model = config.get("model") or settings.llm_model

    conversation_id = body.conversation_id or _new_id("conv")
    now = int(time.time())

    user_msg = ChatMessage(
        id=_new_id("msg"),
        agent_id=agent_id,
        conversation_id=conversation_id,
        role="user",
        content=body.message,
        created_at=now,
    )

    # Get conversation history
    history = await state.chat.list_messages(agent_id, conversation_id)

    # Build messages for LLM
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": user_msg.role, "content": user_msg.content})

    runtime = OpenAICompatibleChatRuntime(
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
        model=model,
    )
    try:
        reply = await runtime.complete(messages)
    except ChatRuntimeNotConfigured as e:
        raise HTTPException(503, str(e))
    except ChatRuntimeError as e:
        raise HTTPException(502, str(e))

    assistant_msg = ChatMessage(
        id=_new_id("msg"),
        agent_id=agent_id,
        conversation_id=conversation_id,
        role="assistant",
        content=reply,
        created_at=now + 1,
    )

    # Persist only after the runtime call succeeds, so failed calls do not pollute history.
    await state.chat.create_message(user_msg)
    await state.chat.create_message(assistant_msg)

    # Update agent usage
    agent.usage_count = (agent.usage_count or 0) + 1
    agent.last_used_at = now
    await state.agents.update(agent)

    return ChatResponse(
        reply=reply,
        conversation_id=conversation_id,
        user_message_id=user_msg.id,
        assistant_message_id=assistant_msg.id,
    )


@router.get("/{agent_id}/conversations")
async def list_conversations(agent_id: str, state=Depends(get_state)):
    if not await state.agents.get(agent_id):
        raise HTTPException(404, "Agent not found")
    return await state.chat.list_conversations(agent_id)


@router.get("/{agent_id}/conversations/{conversation_id}")
async def get_conversation(agent_id: str, conversation_id: str, state=Depends(get_state)):
    if not await state.agents.get(agent_id):
        raise HTTPException(404, "Agent not found")
    messages = await state.chat.list_messages(agent_id, conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}
