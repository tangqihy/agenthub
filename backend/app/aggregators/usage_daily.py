from collections import defaultdict
from datetime import date, timedelta

from app.models.domain import Session, UsageDaily
from app.repositories import UsageRepository
from app.storage.base import StorageBackend


class UsageDailyAggregator:
    def __init__(self, storage: StorageBackend) -> None:
        self._usage = UsageRepository(storage)

    async def aggregate_for_date(self, target: date, sessions: list[Session]) -> list[UsageDaily]:
        buckets: dict[tuple[str, str], UsageDaily] = {}
        for session in sessions:
            started = date.fromtimestamp(session.started_at / 1000)
            if started != target:
                continue
            key = (session.source, session.model or "unknown")
            if key not in buckets:
                buckets[key] = UsageDaily(
                    date=target.isoformat(),
                    source=session.source,
                    model=session.model or "unknown",
                )
            bucket = buckets[key]
            bucket.input_tokens += session.input_tokens
            bucket.output_tokens += session.output_tokens
            bucket.tool_calls += session.tool_calls
            bucket.session_count += 1
        return list(buckets.values())

    async def aggregate_recent(self, storage: StorageBackend, days: int = 30) -> None:
        today = date.today()
        all_sessions = await storage.list_sessions(limit=10000)
        records: list[UsageDaily] = []
        for i in range(days):
            target = today - timedelta(days=i)
            records.extend(await self.aggregate_for_date(target, all_sessions))
        await self._usage.upsert_daily(records)
