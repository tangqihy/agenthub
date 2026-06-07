# AgentHub Chat Runtime Adapter

Chat is a post-V2 capability. It must not be treated as part of the V1 Hermes console or the V2 Agent Registry management layer.

## Boundary

- Agent Registry owns metadata: agents, versions, runs, catalog, and Hermes session relationships.
- Chat owns conversations and message history.
- Runtime adapters own execution. The router should delegate to an adapter instead of embedding provider-specific request logic.

## Current Adapter

The current implementation supports an OpenAI-compatible HTTP chat completion endpoint.

Required environment variables:

| Variable | Description |
|---|---|
| `LLM_BASE_URL` | Provider base URL, without a trailing `/chat/completions` |
| `LLM_API_KEY` | Provider API key |
| `LLM_MODEL` | Default model when an Agent version does not specify `config_json.model` |

If any required value is missing, the API returns `503` and does not persist a partial chat turn.

The frontend can check runtime availability through:

```text
GET /api/v2/agents/runtime/status
```

When `configured=false`, the Chat page disables sending and shows a configuration warning.

## Agent Configuration

Each Agent version may provide:

| Field | Description |
|---|---|
| `config_json.prompt` | System prompt used for the chat session |
| `config_json.model` | Model override for this Agent |

If `config_json.model` is empty, the runtime falls back to `LLM_MODEL`.

## Conversation Isolation

All chat history reads must be scoped by both `agent_id` and `conversation_id`.

This prevents one Agent from loading another Agent's conversation when a `conversation_id` is guessed, reused, or passed from a stale client route.

## Future Runtime Adapters

Future adapters should implement the same conceptual contract:

```python
async def complete(messages: list[dict], *, max_tokens: int = 2048) -> str:
    ...
```

Candidate adapters:

- Hermes CLI session runtime
- Claude Code / Codex / OpenCode adapters
- MCP and Skills-aware runtime

Provider secrets must remain environment-provided. Do not commit provider-specific URLs or keys as code defaults.
