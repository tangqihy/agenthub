from dataclasses import dataclass

from app.config import settings
from app.cron.queue import CronCommandQueue, CronController
from app.repositories import (
    AgentRepository,
    ChatRepository,
    CronRepository,
    EventRepository,
    GatewayRepository,
    SessionRepository,
    UsageRepository,
)
from app.storage.factory import create_storage
from app.sync_worker import SyncWorker


@dataclass
class AppState:
    storage: object
    sessions: SessionRepository
    events: EventRepository
    cron: CronRepository
    usage: UsageRepository
    gateways: GatewayRepository
    agents: AgentRepository
    chat: ChatRepository
    sync_worker: SyncWorker
    cron_queue: CronCommandQueue
    cron_controller: CronController


_state: AppState | None = None


async def init_app_state() -> AppState:
    global _state
    storage = create_storage()
    await storage.init_schema()
    cron_controller = CronController()
    cron_queue = CronCommandQueue()
    await cron_queue.start(cron_controller)
    sync_worker = SyncWorker(storage)
    await sync_worker.start()
    _state = AppState(
        storage=storage,
        sessions=SessionRepository(storage),
        events=EventRepository(storage),
        cron=CronRepository(storage),
        usage=UsageRepository(storage),
        gateways=GatewayRepository(storage),
        agents=AgentRepository(storage),
        chat=ChatRepository(storage),
        sync_worker=sync_worker,
        cron_queue=cron_queue,
        cron_controller=cron_controller,
    )
    return _state


async def shutdown_app_state() -> None:
    global _state
    if _state:
        await _state.sync_worker.stop()
        await _state.cron_queue.stop()
        _state = None


def get_state() -> AppState:
    if _state is None:
        raise RuntimeError("App state not initialized")
    return _state
