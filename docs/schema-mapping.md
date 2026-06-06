# Hermes → AgentHub Schema Mapping

## Session

| Hermes (state.db) | AgentHub | 规则 |
|-------------------|----------|------|
| `sessions.id` | `external_id` | 原样保留 |
| — | `id` | `ah-{external_id}` |
| `sessions.title` | `title` | |
| `sessions.source` | `source` | 默认 `hermes` |
| `sessions.model` | `model` | |
| `sessions.started_at` | `started_at` | ms |
| `sessions.ended_at` | `ended_at` | ms 或 null |
| — | `is_active` | `ended_at IS NULL` |
| `sessions.input_tokens` | `input_tokens` | |
| `sessions.output_tokens` | `output_tokens` | |
| `sessions.tool_calls` | `tool_calls` | |

**禁止**在同步层生成 `running/waiting/failed`。UI 映射：`is_active=true` → Active，`false` → Archived。

## Event (from messages)

| Hermes messages | event_type | payload |
|-----------------|------------|---------|
| `role=user` | `user_message` | `{content}` |
| `role=assistant` | `assistant_message` | `{content}` |
| `role=tool` + tool_name | `tool_call` / `tool_result` | tool, input/result |
| input/output_tokens | `token_usage` | token counts |

整行原始记录 → `raw_json`（Event.raw）

## Gateway

`gateway_state.json` → `Gateway` 一对一字段映射。

## Cron

`cron/jobs.json` → `CronJob` 一对一字段映射。

## usage_daily

由 AgentHub Sync Worker **日聚合**生成，非 Hermes 直读：

| 来源 | 字段 |
|------|------|
| sessions 按 date/source/model 分组 | input_tokens, output_tokens, tool_calls, session_count |
| 预留 | cost (默认 0) |

## 扩展（V4）

新 Adapter 只需实现 Reader + mapper，输出相同 AgentHub 模型即可。
