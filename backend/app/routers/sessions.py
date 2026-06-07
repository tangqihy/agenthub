from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import get_state
from app.models.domain import Event, Session
from app.security import require_auth

router = APIRouter(
    prefix="/api/v1/sessions",
    tags=["sessions"],
    dependencies=[Depends(require_auth)],
)


@router.get("", response_model=list[Session])
async def list_sessions(
    active: bool | None = Query(default=None),
    source: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    state=Depends(get_state),
):
    return await state.sessions.list_all(
        active=active, source=source, limit=limit, offset=offset
    )


@router.get("/{session_id}", response_model=Session)
async def get_session(session_id: str, state=Depends(get_state)):
    session = await state.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/{session_id}/events", response_model=list[Event])
async def list_events(
    session_id: str,
    since: int | None = Query(default=None),
    state=Depends(get_state),
):
    if not await state.sessions.get(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return await state.events.list_for_session(session_id, since=since)
