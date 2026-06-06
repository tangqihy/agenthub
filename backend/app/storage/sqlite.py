import json
import time
from datetime import date, timedelta
from pathlib import Path

import aiosqlite

from app.models.domain import (
    CronJob,
    Event,
    Gateway,
    Session,
    TopSession,
    UsageDaily,
    UsageSummary,
)
from app.storage.base import StorageBackend

SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def _loads(raw: str | None) -> dict:
    if not raw:
        return {}
    return json.loads(raw)


def _session_from_row(row: aiosqlite.Row) -> Session:
    return Session(
        id=row["id"],
        external_id=row["external_id"],
        title=row["title"],
        source=row["source"],
        model=row["model"],
        started_at=row["started_at"],
        ended_at=row["ended_at"],
        is_active=bool(row["is_active"]),
        input_tokens=row["input_tokens"],
        output_tokens=row["output_tokens"],
        tool_calls=row["tool_calls"],
    )


def _event_from_row(row: aiosqlite.Row) -> Event:
    return Event(
        id=row["id"],
        session_id=row["session_id"],
        timestamp=row["timestamp"],
        event_type=row["event_type"],
        source=row["source"],
        payload=_loads(row["payload_json"]),
        raw=_loads(row["raw_json"]) if row["raw_json"] else None,
    )


class SQLiteBackend(StorageBackend):
    def __init__(self, database_path: str) -> None:
        self.database_path = database_path

    async def init_schema(self) -> None:
        Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        schema = SCHEMA_PATH.read_text(encoding="utf-8")
        async with aiosqlite.connect(self.database_path) as db:
            await db.executescript(schema)
            await db.commit()

    async def list_sessions(
        self,
        *,
        active: bool | None = None,
        source: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Session]:
        clauses: list[str] = []
        params: list[object] = []
        if active is not None:
            clauses.append("is_active = ?")
            params.append(1 if active else 0)
        if source:
            clauses.append("source = ?")
            params.append(source)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        query = (
            f"SELECT * FROM sessions {where} ORDER BY started_at DESC LIMIT ? OFFSET ?"
        )
        params.extend([limit, offset])
        async with aiosqlite.connect(self.database_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
        return [_session_from_row(row) for row in rows]

    async def get_session(self, session_id: str) -> Session | None:
        async with aiosqlite.connect(self.database_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM sessions WHERE id = ?", (session_id,)
            ) as cursor:
                row = await cursor.fetchone()
        return _session_from_row(row) if row else None

    async def upsert_sessions(self, sessions: list[Session]) -> None:
        if not sessions:
            return
        async with aiosqlite.connect(self.database_path) as db:
            await db.executemany(
                """
                INSERT INTO sessions (
                    id, external_id, title, source, model, started_at, ended_at,
                    is_active, input_tokens, output_tokens, tool_calls
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    external_id=excluded.external_id,
                    title=excluded.title,
                    source=excluded.source,
                    model=excluded.model,
                    started_at=excluded.started_at,
                    ended_at=excluded.ended_at,
                    is_active=excluded.is_active,
                    input_tokens=excluded.input_tokens,
                    output_tokens=excluded.output_tokens,
                    tool_calls=excluded.tool_calls
                """,
                [
                    (
                        s.id,
                        s.external_id,
                        s.title,
                        s.source,
                        s.model,
                        s.started_at,
                        s.ended_at,
                        1 if s.is_active else 0,
                        s.input_tokens,
                        s.output_tokens,
                        s.tool_calls,
                    )
                    for s in sessions
                ],
            )
            await db.commit()

    async def list_events(
        self, session_id: str, since: int | None = None, limit: int = 500
    ) -> list[Event]:
        if since is not None:
            query = (
                "SELECT * FROM events WHERE session_id = ? AND timestamp > ? "
                "ORDER BY timestamp ASC LIMIT ?"
            )
            params: tuple[object, ...] = (session_id, since, limit)
        else:
            query = (
                "SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?"
            )
            params = (session_id, limit)
        async with aiosqlite.connect(self.database_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
        return [_event_from_row(row) for row in rows]

    async def upsert_events(self, events: list[Event]) -> None:
        if not events:
            return
        async with aiosqlite.connect(self.database_path) as db:
            await db.executemany(
                """
                INSERT INTO events (
                    id, session_id, timestamp, event_type, source, payload_json, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    session_id=excluded.session_id,
                    timestamp=excluded.timestamp,
                    event_type=excluded.event_type,
                    source=excluded.source,
                    payload_json=excluded.payload_json,
                    raw_json=excluded.raw_json
                """,
                [
                    (
                        e.id,
                        e.session_id,
                        e.timestamp,
                        e.event_type,
                        e.source,
                        json.dumps(e.payload, ensure_ascii=False),
                        json.dumps(e.raw, ensure_ascii=False) if e.raw else None,
                    )
                    for e in events
                ],
            )
            await db.commit()

    async def list_cron_jobs(self) -> list[CronJob]:
        async with aiosqlite.connect(self.database_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM cron_jobs ORDER BY name") as cursor:
                rows = await cursor.fetchall()
        return [
            CronJob(
                id=row["id"],
                name=row["name"],
                schedule=row["schedule"],
                status=row["status"],
                last_run_at=row["last_run_at"],
                next_run_at=row["next_run_at"],
                payload=_loads(row["payload_json"]),
            )
            for row in rows
        ]

    async def upsert_cron_jobs(self, jobs: list[CronJob]) -> None:
        if not jobs:
            return
        async with aiosqlite.connect(self.database_path) as db:
            await db.executemany(
                """
                INSERT INTO cron_jobs (
                    id, name, schedule, status, last_run_at, next_run_at, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    schedule=excluded.schedule,
                    status=excluded.status,
                    last_run_at=excluded.last_run_at,
                    next_run_at=excluded.next_run_at,
                    payload_json=excluded.payload_json
                """,
                [
                    (
                        j.id,
                        j.name,
                        j.schedule,
                        j.status,
                        j.last_run_at,
                        j.next_run_at,
                        json.dumps(j.payload, ensure_ascii=False),
                    )
                    for j in jobs
                ],
            )
            await db.commit()

    async def list_gateways(self) -> list[Gateway]:
        async with aiosqlite.connect(self.database_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM gateways ORDER BY platform") as cursor:
                rows = await cursor.fetchall()
        return [
            Gateway(
                id=row["id"],
                platform=row["platform"],
                status=row["status"],
                last_seen=row["last_seen"],
                message_count=row["message_count"],
                latency_ms=row["latency_ms"],
                error_count=row["error_count"],
            )
            for row in rows
        ]

    async def upsert_gateways(self, gateways: list[Gateway]) -> None:
        if not gateways:
            return
        async with aiosqlite.connect(self.database_path) as db:
            await db.executemany(
                """
                INSERT INTO gateways (
                    id, platform, status, last_seen, message_count, latency_ms, error_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    platform=excluded.platform,
                    status=excluded.status,
                    last_seen=excluded.last_seen,
                    message_count=excluded.message_count,
                    latency_ms=excluded.latency_ms,
                    error_count=excluded.error_count
                """,
                [
                    (
                        g.id,
                        g.platform,
                        g.status,
                        g.last_seen,
                        g.message_count,
                        g.latency_ms,
                        g.error_count,
                    )
                    for g in gateways
                ],
            )
            await db.commit()

    async def get_usage_daily(
        self,
        date_from: str | None = None,
        date_to: str | None = None,
        source: str | None = None,
        model: str | None = None,
    ) -> list[UsageDaily]:
        clauses: list[str] = []
        params: list[object] = []
        if date_from:
            clauses.append("date >= ?")
            params.append(date_from)
        if date_to:
            clauses.append("date <= ?")
            params.append(date_to)
        if source:
            clauses.append("source = ?")
            params.append(source)
        if model:
            clauses.append("model = ?")
            params.append(model)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        query = f"SELECT * FROM usage_daily {where} ORDER BY date DESC"
        async with aiosqlite.connect(self.database_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
        return [
            UsageDaily(
                date=row["date"],
                source=row["source"],
                model=row["model"],
                input_tokens=row["input_tokens"],
                output_tokens=row["output_tokens"],
                cost=row["cost"],
                tool_calls=row["tool_calls"],
                session_count=row["session_count"],
            )
            for row in rows
        ]

    async def upsert_usage_daily(self, records: list[UsageDaily]) -> None:
        if not records:
            return
        async with aiosqlite.connect(self.database_path) as db:
            await db.executemany(
                """
                INSERT INTO usage_daily (
                    date, source, model, input_tokens, output_tokens, cost,
                    tool_calls, session_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(date, source, model) DO UPDATE SET
                    input_tokens=excluded.input_tokens,
                    output_tokens=excluded.output_tokens,
                    cost=excluded.cost,
                    tool_calls=excluded.tool_calls,
                    session_count=excluded.session_count
                """,
                [
                    (
                        r.date,
                        r.source,
                        r.model,
                        r.input_tokens,
                        r.output_tokens,
                        r.cost,
                        r.tool_calls,
                        r.session_count,
                    )
                    for r in records
                ],
            )
            await db.commit()

    async def _sum_tokens_between(self, start: str, end: str) -> tuple[int, float]:
        async with aiosqlite.connect(self.database_path) as db:
            async with db.execute(
                """
                SELECT COALESCE(SUM(input_tokens + output_tokens), 0),
                       COALESCE(SUM(cost), 0)
                FROM usage_daily WHERE date >= ? AND date <= ?
                """,
                (start, end),
            ) as cursor:
                row = await cursor.fetchone()
        return int(row[0]), float(row[1])

    async def get_usage_summary(self) -> UsageSummary:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        today_s = today.isoformat()
        week_s = week_start.isoformat()
        month_s = month_start.isoformat()
        today_tokens, today_cost = await self._sum_tokens_between(today_s, today_s)
        week_tokens, week_cost = await self._sum_tokens_between(week_s, today_s)
        month_tokens, month_cost = await self._sum_tokens_between(month_s, today_s)
        return UsageSummary(
            today_tokens=today_tokens,
            week_tokens=week_tokens,
            month_tokens=month_tokens,
            today_cost=today_cost,
            week_cost=week_cost,
            month_cost=month_cost,
        )

    async def get_usage_by_source(self, limit: int = 10) -> list[dict]:
        async with aiosqlite.connect(self.database_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """
                SELECT source,
                       SUM(input_tokens + output_tokens) AS tokens,
                       SUM(cost) AS cost
                FROM usage_daily
                GROUP BY source
                ORDER BY tokens DESC
                LIMIT ?
                """,
                (limit,),
            ) as cursor:
                rows = await cursor.fetchall()
        return [
            {"source": row["source"], "tokens": row["tokens"], "cost": row["cost"]}
            for row in rows
        ]

    async def get_usage_by_tool(self, limit: int = 10) -> list[dict]:
        async with aiosqlite.connect(self.database_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """
                SELECT json_extract(payload_json, '$.tool') AS tool, COUNT(*) AS calls
                FROM events
                WHERE event_type = 'tool_call'
                  AND json_extract(payload_json, '$.tool') IS NOT NULL
                GROUP BY tool
                ORDER BY calls DESC
                LIMIT ?
                """,
                (limit,),
            ) as cursor:
                rows = await cursor.fetchall()
        return [{"tool": row["tool"], "calls": row["calls"]} for row in rows]

    async def get_usage_by_model(self, limit: int = 10) -> list[dict]:
        async with aiosqlite.connect(self.database_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """
                SELECT model,
                       SUM(input_tokens + output_tokens) AS tokens,
                       SUM(cost) AS cost
                FROM usage_daily
                GROUP BY model
                ORDER BY tokens DESC
                LIMIT ?
                """,
                (limit,),
            ) as cursor:
                rows = await cursor.fetchall()
        return [
            {"model": row["model"], "tokens": row["tokens"], "cost": row["cost"]}
            for row in rows
        ]

    async def get_top_sessions(self, limit: int = 10) -> list[TopSession]:
        async with aiosqlite.connect(self.database_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """
                SELECT id, title, (input_tokens + output_tokens) AS tokens
                FROM sessions
                ORDER BY tokens DESC
                LIMIT ?
                """,
                (limit,),
            ) as cursor:
                rows = await cursor.fetchall()
        return [
            TopSession(session_id=row["id"], title=row["title"], tokens=row["tokens"])
            for row in rows
        ]

    async def get_sync_state(self, key: str) -> str | None:
        async with aiosqlite.connect(self.database_path) as db:
            async with db.execute(
                "SELECT value FROM sync_state WHERE key = ?", (key,)
            ) as cursor:
                row = await cursor.fetchone()
        return row[0] if row else None

    async def set_sync_state(self, key: str, value: str) -> None:
        now = int(time.time() * 1000)
        async with aiosqlite.connect(self.database_path) as db:
            await db.execute(
                """
                INSERT INTO sync_state (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
                """,
                (key, value, now),
            )
            await db.commit()
