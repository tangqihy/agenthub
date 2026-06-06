import json
from pathlib import Path

from app.models.domain import CronJob, Event, Gateway, Session


def map_session_row(row: dict) -> Session:
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
        tool_calls=int(row.get("tool_calls") or 0),
    )


def map_message_row(row: dict) -> Event | None:
    role = row.get("role")
    created_at = int(row["created_at"])
    raw = dict(row)
    event_id = f"evt-{row['id']}"

    if role == "user":
        return Event(
            id=event_id,
            session_id=f"ah-{row['session_id']}",
            timestamp=created_at,
            event_type="user_message",
            source="hermes",
            payload={"content": row.get("content") or ""},
            raw=raw,
        )
    if role == "assistant":
        return Event(
            id=event_id,
            session_id=f"ah-{row['session_id']}",
            timestamp=created_at,
            event_type="assistant_message",
            source="hermes",
            payload={"content": row.get("content") or ""},
            raw=raw,
        )
    if role == "tool" or row.get("tool_name"):
        tool = row.get("tool_name") or "unknown"
        if row.get("tool_output"):
            return Event(
                id=event_id,
                session_id=f"ah-{row['session_id']}",
                timestamp=created_at,
                event_type="tool_result",
                source="hermes",
                payload={"tool": tool, "result": row.get("tool_output") or ""},
                raw=raw,
            )
        return Event(
            id=event_id,
            session_id=f"ah-{row['session_id']}",
            timestamp=created_at,
            event_type="tool_call",
            source="hermes",
            payload={"tool": tool, "input": row.get("tool_input") or ""},
            raw=raw,
        )
    if row.get("input_tokens") or row.get("output_tokens"):
        return Event(
            id=event_id,
            session_id=f"ah-{row['session_id']}",
            timestamp=created_at,
            event_type="token_usage",
            source="hermes",
            payload={
                "input_tokens": int(row.get("input_tokens") or 0),
                "output_tokens": int(row.get("output_tokens") or 0),
            },
            raw=raw,
        )
    return None


def map_cron_job(item: dict) -> CronJob:
    return CronJob(
        id=item["id"],
        name=item.get("name") or item["id"],
        schedule=item.get("schedule") or "",
        status=item.get("status") or "active",
        last_run_at=item.get("last_run_at"),
        next_run_at=item.get("next_run_at"),
        payload=item.get("payload") or {},
    )


def map_gateway(item: dict) -> Gateway:
    return Gateway(
        id=item["id"],
        platform=item.get("platform") or "unknown",
        status=item.get("status") or "offline",
        last_seen=int(item.get("last_seen") or 0),
        message_count=int(item.get("message_count") or 0),
        latency_ms=item.get("latency_ms"),
        error_count=int(item.get("error_count") or 0),
    )


def load_json_file(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))
