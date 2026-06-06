from fastapi import APIRouter, Depends, Query

from app.deps import get_state
from app.models.domain import Gateway, TopSession, UsageDaily, UsageSummary

router = APIRouter(prefix="/api/v1", tags=["analytics"])


@router.get("/analytics/summary", response_model=UsageSummary)
async def analytics_summary(state=Depends(get_state)):
    return await state.usage.summary()


@router.get("/analytics/daily", response_model=list[UsageDaily])
async def analytics_daily(
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    state=Depends(get_state),
):
    return await state.usage.get_daily(date_from=date_from, date_to=date_to)


@router.get("/analytics/by-source")
async def analytics_by_source(
    limit: int = Query(default=10), state=Depends(get_state)
):
    return await state.usage.by_source(limit)


@router.get("/analytics/by-tool")
async def analytics_by_tool(limit: int = Query(default=10), state=Depends(get_state)):
    return await state.usage.by_tool(limit)


@router.get("/analytics/by-model")
async def analytics_by_model(limit: int = Query(default=10), state=Depends(get_state)):
    return await state.usage.by_model(limit)


@router.get("/analytics/top-sessions", response_model=list[TopSession])
async def analytics_top_sessions(
    limit: int = Query(default=10), state=Depends(get_state)
):
    return await state.usage.top_sessions(limit)


@router.get("/gateways", response_model=list[Gateway])
async def list_gateways(state=Depends(get_state)):
    return await state.gateways.list_all()
