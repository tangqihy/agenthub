import asyncio
import logging
from dataclasses import dataclass
from enum import Enum

from app.config import settings

logger = logging.getLogger(__name__)


class CronAction(str, Enum):
    PAUSE = "pause"
    RESUME = "resume"
    RUN = "run"
    REMOVE = "remove"


@dataclass
class CronCommand:
    job_id: str
    action: CronAction


class CronCommandQueue:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[CronCommand | None] = asyncio.Queue()
        self._worker_task: asyncio.Task | None = None

    async def start(self, controller) -> None:
        if self._worker_task is None:
            self._worker_task = asyncio.create_task(self._worker(controller))

    async def stop(self) -> None:
        if self._worker_task:
            await self._queue.put(None)
            await self._worker_task
            self._worker_task = None

    async def enqueue(self, command: CronCommand) -> None:
        await self._queue.put(command)

    async def _worker(self, controller) -> None:
        while True:
            command = await self._queue.get()
            if command is None:
                break
            try:
                await controller.execute(command)
            except Exception:
                logger.exception("Cron command failed: %s", command)
            finally:
                self._queue.task_done()


class CronController:
    async def execute(self, command: CronCommand) -> None:
        if settings.cron_mock:
            logger.info("Mock cron %s %s", command.action.value, command.job_id)
            return
        import asyncio
        import subprocess

        args = [settings.hermes_bin, "cron", command.action.value, command.job_id]
        await asyncio.to_thread(
            subprocess.run, args, capture_output=True, text=True, check=False
        )
