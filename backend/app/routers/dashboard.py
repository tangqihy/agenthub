from fastapi import APIRouter, Depends

from app.deps import get_state
from app.models.domain import DashboardData
from app.security import require_auth

router = APIRouter(
    prefix="/api/v1", tags=["dashboard"], dependencies=[Depends(require_auth)]
)


@router.get("/dashboard", response_model=DashboardData)
async def dashboard(state=Depends(get_state)):
    usage = await state.usage.summary()
    by_source = await state.usage.by_source()
    active_sessions = await state.sessions.list_all(active=True, limit=5)
    top_sessions = await state.usage.top_sessions(10)
    gateways = await state.gateways.list_all()
    cron_jobs = await state.cron.list_all()
    active_count = sum(1 for j in cron_jobs if j.status == "active")
    paused_count = sum(1 for j in cron_jobs if j.status == "paused")
    return DashboardData(
        usage=usage,
        by_source=by_source,
        active_sessions=active_sessions,
        top_sessions=top_sessions,
        gateways=gateways,
        cron_summary={
            "active": active_count,
            "paused": paused_count,
            "recent": [j.model_dump() for j in cron_jobs[:5]],
        },
    )


@router.post("/sync")
async def trigger_sync(state=Depends(get_state)):
    await state.sync_worker.run_once()
    return {"status": "synced"}
