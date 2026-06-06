import json
from pathlib import Path

from app.models.domain import CronJob, Event, Gateway, Session


def map_session_row(row: dict) -> Session:
    """Hermes sessions 行 → AgentHub Session。

    Hermes 字段：id, source, model, started_at, ended_at, title,
                 tool_call_count, input_tokens, output_tokens
    """
    ended_at = row.get("ended_at")
    return Session(
        id=f"ah-{row['id']}",
        external_id=row["id"],
        title=row.get("title") or row["id"],
        source=row.get("source") or "hermes",
        model=row.get("model"),
        started_at=int(row["started_at"]),
        ended_at=int(ended_at) if ended_at is not None else None,
        is_active=ended_at is None,
        input_tokens=int(row.get("input_tokens") or 0),
        output_tokens=int(row.get("output_tokens") or 0),
        tool_calls=int(row.get("tool_call_count") or 0),
    )


def map_message_row(row: dict) -> Event | None:
    """Hermes messages 行 → AgentHub Event。

    Hermes 字段：id, session_id, role, content, tool_call_id,
                 tool_calls, tool_name, timestamp, token_count
    """
    role = row.get("role")
    timestamp = int(row["timestamp"])
    raw = dict(row)
    event_id = f"evt-{row['id']}"

    if role == "user":
        return Event(
            id=event_id,
            session_id=f"ah-{row['session_id']}",
            timestamp=timestamp,
            event_type="user_message",
            source="hermes",
            payload={"content": row.get("content") or ""},
            raw=raw,
        )
    if role == "assistant":
        return Event(
            id=event_id,
            session_id=f"ah-{row['session_id']}",
            timestamp=timestamp,
            event_type="assistant_message",
            source="hermes",
            payload={"content": row.get("content") or ""},
            raw=raw,
        )
    if role == "tool" or row.get("tool_name"):
        tool = row.get("tool_name") or "unknown"
        return Event(
            id=event_id,
            session_id=f"ah-{row['session_id']}",
            timestamp=timestamp,
            event_type="tool_call",
            source="hermes",
            payload={
                "tool": tool,
                "content": row.get("content") or "",
                "tool_call_id": row.get("tool_call_id") or "",
            },
            raw=raw,
        )
    if row.get("token_count"):
        return Event(
            id=event_id,
            session_id=f"ah-{row['session_id']}",
            timestamp=timestamp,
            event_type="token_usage",
            source="hermes",
            payload={"token_count": int(row.get("token_count") or 0)},
            raw=raw,
        )
    return None


def map_cron_job(item: dict) -> CronJob:
    return CronJob(
        id=item["id"],
        name=item.get("name") or item["id"],
        schedule=item.get("schedule_display") or item.get("schedule", {}).get("expr", ""),
        status="paused" if item.get("paused_at") else "active",
        last_run_at=_to_ms(item.get("last_run_at")),
        next_run_at=_to_ms(item.get("next_run_at")),
        payload=item,
    )


def map_gateway(item: dict, platform: str) -> Gateway:
    state = item.get("state", "offline")
    return Gateway(
        id=f"gw-{platform}",
        platform=platform,
        status="online" if state == "connected" else "offline",
        last_seen=_to_ms(item.get("updated_at")) or 0,
        message_count=0,
        latency_ms=None,
        error_count=0,
    )


def _to_ms(value) -> int | None:
    """将 ISO 时间戳或 Unix 时间戳转为毫秒。"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value * 1000) if value < 1e12 else int(value)
    if isinstance(value, str):
        from datetime import datetime
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return int(dt.timestamp() * 1000)
        except ValueError:
            return None
    return None


def load_json_file(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))
