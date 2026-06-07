from __future__ import annotations

from app.models.domain import Agent, AgentRun, AgentVersion, CronJob, Event, Session, UsageDaily
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


class AgentRepository:
    def __init__(self, storage: StorageBackend) -> None:
        self._storage = storage

    async def list_all(self, *, runtime: str | None = None, scope: str | None = None, q: str | None = None) -> list[Agent]:
        return await self._storage.list_agents(runtime=runtime, scope=scope, q=q)

    async def get(self, agent_id: str) -> Agent | None:
        return await self._storage.get_agent(agent_id)

    async def create(self, agent: Agent) -> None:
        await self._storage.create_agent(agent)

    async def update(self, agent: Agent) -> None:
        await self._storage.update_agent(agent)

    async def delete(self, agent_id: str) -> None:
        await self._storage.delete_agent(agent_id)

    async def list_versions(self, agent_id: str) -> list[AgentVersion]:
        return await self._storage.list_agent_versions(agent_id)

    async def get_version(self, agent_id: str, version: int) -> AgentVersion | None:
        return await self._storage.get_agent_version(agent_id, version)

    async def create_version(self, v: AgentVersion) -> None:
        await self._storage.create_agent_version(v)

    async def list_runs(self, agent_id: str, limit: int = 20) -> list[AgentRun]:
        return await self._storage.list_agent_runs(agent_id, limit)

    async def create_run(self, run: AgentRun) -> None:
        await self._storage.create_agent_run(run)

    async def increment_usage(self, agent_id: str) -> None:
        await self._storage.increment_agent_usage(agent_id)

    async def catalog(self, *, sort: str = "recent", limit: int = 50) -> list[Agent]:
        return await self._storage.list_agents_catalog(sort=sort, limit=limit)

    async def get_children(self, parent_agent_id: str) -> list[Agent]:
        return await self._storage.get_child_agents(parent_agent_id)
