import asyncio
import logging

from app.aggregators.usage_daily import UsageDailyAggregator
from app.config import settings
from app.readers.cron_json import CronJsonReader
from app.readers.gateway_json import GatewayJsonReader
from app.readers.state_db import HermesStateDbReader
from app.repositories import (
    CronRepository,
    EventRepository,
    GatewayRepository,
    SessionRepository,
    SyncStateRepository,
)

logger = logging.getLogger(__name__)

KEY_SESSION = "last_session_sync_ts"
KEY_MESSAGE = "last_message_sync_ts"
KEY_USAGE = "last_usage_aggregate_date"


class SyncWorker:
    def __init__(self, storage) -> None:
        self._storage = storage
        self._sessions = SessionRepository(storage)
        self._events = EventRepository(storage)
        self._cron = CronRepository(storage)
        self._gateways = GatewayRepository(storage)
        self._sync_state = SyncStateRepository(storage)
        self._aggregator = UsageDailyAggregator(storage)
        self._state_reader = HermesStateDbReader(settings.hermes_data_dir)
        self._gateway_reader = GatewayJsonReader(settings.hermes_data_dir)
        self._cron_reader = CronJsonReader(settings.hermes_data_dir)
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        if self._task is None:
            await self.run_once()
            self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _loop(self) -> None:
        while True:
            await asyncio.sleep(settings.sync_interval_seconds)
            try:
                await self.run_once()
            except Exception:
                logger.exception("Sync worker iteration failed")

    async def run_once(self) -> None:
        session_after = _parse_int(await self._sync_state.get(KEY_SESSION))
        message_after = _parse_int(await self._sync_state.get(KEY_MESSAGE))

        sessions = self._state_reader.read_sessions(session_after)
        events = self._state_reader.read_events(message_after)
        gateways = self._gateway_reader.read_gateways()
        cron_jobs = self._cron_reader.read_jobs()

        if sessions:
            await self._sessions.upsert_many(sessions)
            max_updated = max(
                s.started_at if s.is_active else (s.ended_at or s.started_at)
                for s in sessions
            )
            await self._sync_state.set(KEY_SESSION, str(max_updated))

        if events:
            await self._events.upsert_many(events)
            max_ts = max(e.timestamp for e in events)
            await self._sync_state.set(KEY_MESSAGE, str(max_ts))

        if gateways:
            await self._gateways.upsert_many(gateways)
        if cron_jobs:
            await self._cron.upsert_many(cron_jobs)

        await self._aggregator.aggregate_recent(self._storage, days=30)
        from datetime import date

        await self._sync_state.set(KEY_USAGE, date.today().isoformat())
        logger.info(
            "Sync complete: %d sessions, %d events, %d gateways, %d cron",
            len(sessions),
            len(events),
            len(gateways),
            len(cron_jobs),
        )


def _parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    return int(value)
