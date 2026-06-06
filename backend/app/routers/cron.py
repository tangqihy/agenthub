from fastapi import APIRouter, Depends

from app.cron.queue import CronAction, CronCommand
from app.deps import get_state
from app.models.domain import CronJob

router = APIRouter(prefix="/api/v1/cron", tags=["cron"])


@router.get("", response_model=list[CronJob])
async def list_cron(state=Depends(get_state)):
    return await state.cron.list_all()


async def _enqueue(action: CronAction, job_id: str, state):
    await state.cron_queue.enqueue(CronCommand(job_id=job_id, action=action))
    await state.sync_worker.run_once()
    return {"status": "queued", "action": action.value, "job_id": job_id}


@router.post("/{job_id}/pause")
async def pause_cron(job_id: str, state=Depends(get_state)):
    return await _enqueue(CronAction.PAUSE, job_id, state)


@router.post("/{job_id}/resume")
async def resume_cron(job_id: str, state=Depends(get_state)):
    return await _enqueue(CronAction.RESUME, job_id, state)


@router.post("/{job_id}/run")
async def run_cron(job_id: str, state=Depends(get_state)):
    return await _enqueue(CronAction.RUN, job_id, state)


@router.delete("/{job_id}")
async def remove_cron(job_id: str, state=Depends(get_state)):
    return await _enqueue(CronAction.REMOVE, job_id, state)
