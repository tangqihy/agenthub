# Hermes state.db Schema (Production)

> 基于火山云 VPS `~/.hermes/state.db` 实际 schema
> 更新时间：2026-06-07

## sessions

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,              -- "20260606_190447_e9b5192c"
    source TEXT NOT NULL,             -- "cli" | "cron" | "feishu" | "weixin"
    user_id TEXT,
    model TEXT,                       -- "mimo-v2.5-pro"
    model_config TEXT,                -- JSON
    system_prompt TEXT,
    parent_session_id TEXT,           -- 子agent父session
    started_at REAL NOT NULL,         -- Unix timestamp (秒)
    ended_at REAL,                    -- NULL = 活跃中
    end_reason TEXT,
    message_count INTEGER DEFAULT 0,
    tool_call_count INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    reasoning_tokens INTEGER DEFAULT 0,
    billing_provider TEXT,
    billing_base_url TEXT,
    billing_mode TEXT,
    estimated_cost_usd REAL,
    actual_cost_usd REAL,
    cost_status TEXT,
    cost_source TEXT,
    pricing_version TEXT,
    title TEXT
);
```

**索引建议**：
- `source` + `started_at` (降序)
- `started_at` (降序)

## messages

```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,         -- 关联 sessions.id
    role TEXT NOT NULL,               -- "system" | "user" | "assistant" | "tool"
    content TEXT,
    tool_call_id TEXT,
    tool_calls TEXT,                  -- JSON array
    tool_name TEXT,
    timestamp REAL NOT NULL,          -- Unix timestamp (秒)
    token_count INTEGER,
    finish_reason TEXT,
    reasoning TEXT,
    reasoning_details TEXT,
    codex_reasoning_items TEXT
);
```

**索引建议**：
- `session_id` + `timestamp`
- `timestamp`

## 字段映射 (Hermes → AgentHub)

| Hermes sessions | AgentHub Session | 说明 |
|----------------|------------------|------|
| `id` | `external_id` | 原始 ID |
| `ah-{id}` | `id` | AgentHub 前缀 |
| `source` | `source` | 直接映射 |
| `model` | `model` | 直接映射 |
| `started_at` | `started_at` | Unix timestamp |
| `ended_at` | `ended_at` | NULL → `is_active=true` |
| `tool_call_count` | `tool_calls` | 字段名不同 |
| `input_tokens` | `input_tokens` | 直接映射 |
| `output_tokens` | `output_tokens` | 直接映射 |

| Hermes messages | AgentHub Event | 说明 |
|----------------|----------------|------|
| `id` | `evt-{id}` | 前缀 |
| `session_id` | `session_id` | 前缀 `ah-` |
| `role` | `event_type` | user→user_message, assistant→assistant_message, tool→tool_call |
| `content` | `payload.content` | |
| `tool_name` | `payload.tool` | |
| `timestamp` | `timestamp` | Unix timestamp |
| `token_count` | `payload.token_count` | |

## gateway_state.json

```json
{
  "pid": 213159,
  "kind": "hermes-gateway",
  "gateway_state": "running",
  "platforms": {
    "feishu": {
      "state": "connected",
      "error_code": null,
      "error_message": null,
      "updated_at": "2026-04-25T06:35:22.616107+00:00"
    },
    "weixin": {
      "state": "connected",
      "error_code": null,
      "error_message": null,
      "updated_at": "2026-04-25T06:35:22.642302+00:00"
    }
  },
  "updated_at": "2026-04-25T06:35:22.642796+00:00"
}
```

## cron/jobs.json

```json
{
  "jobs": [
    {
      "id": "99a5d0086edc",
      "name": "hermes-arxiv-agent-daily",
      "prompt": "...",
      "skills": [],
      "schedule": {
        "kind": "cron",
        "expr": "17 8 * * *",
        "display": "17 8 * * *"
      },
      "schedule_display": "17 8 * * *",
      "repeat": {
        "times": null,
        "completed": 28
      },
      "enabled": true,
      "state": "scheduled",
      "paused_at": null,
      "paused_reason": null,
      "created_at": "2026-05-09T18:34:54.589322+08:00",
      "next_run_at": "2026-06-07T08:17:00+08:00",
      "last_run_at": "2026-06-06T08:22:51.131289+08:00",
      "last_status": "ok",
      "deliver": "feishu",
      "origin": {
        "platform": "feishu",
        "chat_id": "oc_xxx"
      }
    }
  ]
}
```
