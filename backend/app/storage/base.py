from typing import Protocol

from app.models.domain import (
    CronJob,
    Event,
    Gateway,
    Session,
    TopSession,
    UsageDaily,
    UsageSummary,
)


class StorageBackend(Protocol):
    async def init_schema(self) -> None: ...

    async def list_sessions(
        self,
        *,
        active: bool | None = None,
        source: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Session]: ...

    async def get_session(self, session_id: str) -> Session | None: ...

    async def upsert_sessions(self, sessions: list[Session]) -> None: ...

    async def list_events(
        self, session_id: str, since: int | None = None, limit: int = 500
    ) -> list[Event]: ...

    async def upsert_events(self, events: list[Event]) -> None: ...

    async def list_cron_jobs(self) -> list[CronJob]: ...

    async def upsert_cron_jobs(self, jobs: list[CronJob]) -> None: ...

    async def list_gateways(self) -> list[Gateway]: ...

    async def upsert_gateways(self, gateways: list[Gateway]) -> None: ...

    async def get_usage_daily(
        self,
        date_from: str | None = None,
        date_to: str | None = None,
        source: str | None = None,
        model: str | None = None,
    ) -> list[UsageDaily]: ...

    async def upsert_usage_daily(self, records: list[UsageDaily]) -> None: ...

    async def get_usage_summary(self) -> UsageSummary: ...

    async def get_usage_by_source(self, limit: int = 10) -> list[dict]: ...

    async def get_usage_by_tool(self, limit: int = 10) -> list[dict]: ...

    async def get_usage_by_model(self, limit: int = 10) -> list[dict]: ...

    async def get_top_sessions(self, limit: int = 10) -> list[TopSession]: ...

    async def get_sync_state(self, key: str) -> str | None: ...

    async def set_sync_state(self, key: str, value: str) -> None: ...
