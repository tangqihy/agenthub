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
