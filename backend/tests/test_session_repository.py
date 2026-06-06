import pytest

from app.models.domain import CronJob, Event, Session, UsageDaily


@pytest.mark.asyncio
async def test_session_repository_crud(storage):
    session = Session(
        id="s1",
        external_id="ext1",
        title="Build Android",
        source="hermes",
        model="claude-sonnet",
        started_at=1000,
        ended_at=None,
        is_active=True,
        input_tokens=100,
        output_tokens=50,
        tool_calls=2,
    )
    await storage.upsert_sessions([session])
    loaded = await storage.get_session("s1")
    assert loaded is not None
    assert loaded.title == "Build Android"
    assert loaded.is_active is True

    archived = session.model_copy(update={"ended_at": 2000, "is_active": False})
    await storage.upsert_sessions([archived])
    active_only = await storage.list_sessions(active=True)
    assert len(active_only) == 0


@pytest.mark.asyncio
async def test_event_repository_raw_json(storage):
    event = Event(
        id="e1",
        session_id="s1",
        timestamp=1000,
        event_type="tool_call",
        source="hermes",
        payload={"tool": "p4_sync", "summary": "sync depot"},
        raw={"tool": "p4_sync", "arguments": {"path": "/src"}},
    )
    await storage.upsert_events([event])
    events = await storage.list_events("s1")
    assert len(events) == 1
    assert events[0].raw["arguments"]["path"] == "/src"


@pytest.mark.asyncio
async def test_cron_repository(storage):
    job = CronJob(
        id="c1",
        name="nightly-build",
        schedule="0 2 * * *",
        status="active",
        payload={"command": "build"},
    )
    await storage.upsert_cron_jobs([job])
    jobs = await storage.list_cron_jobs()
    assert jobs[0].name == "nightly-build"


@pytest.mark.asyncio
async def test_usage_daily_with_cost(storage):
    record = UsageDaily(
        date="2026-06-06",
        source="hermes",
        model="claude-sonnet",
        input_tokens=1000,
        output_tokens=500,
        cost=0.0,
        tool_calls=3,
        session_count=2,
    )
    await storage.upsert_usage_daily([record])
    summary = await storage.get_usage_summary()
    assert summary.today_tokens >= 0
    daily = await storage.get_usage_daily(date_from="2026-06-06", date_to="2026-06-06")
    assert daily[0].cost == 0.0


@pytest.mark.asyncio
async def test_sync_state_checkpoint(storage):
    await storage.set_sync_state("last_session_sync_ts", "1000")
    assert await storage.get_sync_state("last_session_sync_ts") == "1000"
