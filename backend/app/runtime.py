"""
Chat Runtime - OpenAI-compatible LLM client with streaming support
"""
import json
from typing import AsyncGenerator

import httpx


class ChatRuntimeError(Exception):
    """Raised when the chat runtime cannot produce a reply."""


class ChatRuntimeNotConfigured(ChatRuntimeError):
    """Raised when runtime configuration is incomplete."""


class OpenAICompatibleChatRuntime:
    def __init__(self, *, base_url: str, api_key: str, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model

    def validate(self) -> None:
        if not self.base_url or not self.api_key or not self.model:
            raise ChatRuntimeNotConfigured("Chat runtime is not configured")

    async def complete(self, messages: list[dict], *, max_tokens: int = 2048) -> str:
        """Non-streaming completion"""
        self.validate()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "max_tokens": max_tokens,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPError as exc:
            raise ChatRuntimeError(f"Chat runtime HTTP error: {exc}") from exc
        except (KeyError, IndexError, TypeError) as exc:
            raise ChatRuntimeError("Chat runtime returned an invalid response") from exc

    async def stream(
        self, messages: list[dict], *, max_tokens: int = 2048
    ) -> AsyncGenerator[dict, None]:
        """Streaming completion - yields SSE events"""
        self.validate()
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "max_tokens": max_tokens,
                        "stream": True,
                    },
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                yield {"type": "done"}
                                break
                            try:
                                data = json.loads(data_str)
                                delta = data.get("choices", [{}])[0].get("delta", {})
                                if delta.get("content"):
                                    yield {
                                        "type": "content",
                                        "content": delta["content"],
                                    }
                                if delta.get("tool_calls"):
                                    yield {
                                        "type": "tool_calls",
                                        "tool_calls": delta["tool_calls"],
                                    }
                            except json.JSONDecodeError:
                                continue
        except httpx.HTTPError as exc:
            raise ChatRuntimeError(f"Chat runtime HTTP error: {exc}") from exc
