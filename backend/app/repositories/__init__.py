from __future__ import annotations

from app.models.domain import CronJob, Event, Session, UsageDaily
from app.storage.base import StorageBackend


class SessionRepository:
    def __init__(self, storage: StorageBackend) -> None:
        self._storage = storage

    async def list_all(
        self,
        *,
        active: bool | None = None,
        source: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Session]:
        return await self._storage.list_sessions(
            active=active, source=source, limit=limit, offset=offset
        )

    async def get(self, session_id: str) -> Session | None:
        return await self._storage.get_session(session_id)

    async def upsert_many(self, sessions: list[Session]) -> None:
        await self._storage.upsert_sessions(sessions)


class EventRepository:
    def __init__(self, storage: StorageBackend) -> None:
        self._storage = storage

    async def list_for_session(
        self, session_id: str, since: int | None = None, limit: int = 500
    ) -> list[Event]:
        return await self._storage.list_events(session_id, since=since, limit=limit)

    async def upsert_many(self, events: list[Event]) -> None:
        await self._storage.upsert_events(events)


class CronRepository:
    def __init__(self, storage: StorageBackend) -> None:
        self._storage = storage

    async def list_all(self) -> list[CronJob]:
        return await self._storage.list_cron_jobs()

    async def upsert_many(self, jobs: list[CronJob]) -> None:
        await self._storage.upsert_cron_jobs(jobs)


class UsageRepository:
    def __init__(self, storage: StorageBackend) -> None:
        self._storage = storage

    async def get_daily(self, **kwargs: object) -> list[UsageDaily]:
        return await self._storage.get_usage_daily(**kwargs)  # type: ignore[arg-type]

    async def upsert_daily(self, records: list[UsageDaily]) -> None:
        await self._storage.upsert_usage_daily(records)

    async def summary(self):
        return await self._storage.get_usage_summary()

    async def by_source(self, limit: int = 10):
        return await self._storage.get_usage_by_source(limit)

    async def by_tool(self, limit: int = 10):
        return await self._storage.get_usage_by_tool(limit)

    async def by_model(self, limit: int = 10):
        return await self._storage.get_usage_by_model(limit)

    async def top_sessions(self, limit: int = 10):
        return await self._storage.get_top_sessions(limit)


class GatewayRepository:
    def __init__(self, storage: StorageBackend) -> None:
        self._storage = storage

    async def list_all(self):
        return await self._storage.list_gateways()

    async def upsert_many(self, gateways) -> None:
        await self._storage.upsert_gateways(gateways)


class SyncStateRepository:
    def __init__(self, storage: StorageBackend) -> None:
        self._storage = storage

    async def get(self, key: str) -> str | None:
        return await self._storage.get_sync_state(key)

    async def set(self, key: str, value: str) -> None:
        await self._storage.set_sync_state(key, value)
