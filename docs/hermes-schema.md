# Hermes state.db Schema (Fixture / Expected)

> 生产环境请以火山云 `sqlite3 ~/.hermes/state.db ".schema"` 输出为准并更新本文档。

## sessions

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    source TEXT,
    model TEXT,
    started_at INTEGER,
    ended_at INTEGER,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    tool_calls INTEGER DEFAULT 0,
    updated_at INTEGER
);
```

## messages

```sql
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    role TEXT,
    content TEXT,
    tool_name TEXT,
    tool_input TEXT,
    tool_output TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    created_at INTEGER,
    metadata TEXT
);
```

## gateway_state.json

```json
{
  "gateways": [
    {
      "id": "string",
      "platform": "wechat|feishu|webhook",
      "status": "online|offline",
      "last_seen": 0,
      "message_count": 0,
      "latency_ms": 0,
      "error_count": 0
    }
  ]
}
```

## cron/jobs.json

```json
{
  "jobs": [
    {
      "id": "string",
      "name": "string",
      "schedule": "cron expr",
      "status": "active|paused",
      "last_run_at": 0,
      "next_run_at": 0,
      "payload": {}
    }
  ]
}
```
