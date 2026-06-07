from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.deps import init_app_state, shutdown_app_state
from app.routers import agents, analytics, chat, cron, dashboard, sessions
from app.security import verify_token


def _ensure_fixtures() -> None:
    fixture_db = Path(settings.hermes_data_dir) / "state.db"
    if fixture_db.exists():
        return
    import sys

    backend_root = Path(__file__).resolve().parents[1]
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))
    from fixtures.hermes.create_fixtures import (
        create_cron_json,
        create_gateway_json,
        create_state_db,
    )

    base = Path(settings.hermes_data_dir)
    create_state_db(base / "state.db")
    create_gateway_json(base / "gateway_state.json")
    create_cron_json(base / "cron" / "jobs.json")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_fixtures()
    await init_app_state()
    yield
    await shutdown_app_state()


app = FastAPI(title="AgentHub API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Health endpoint (no auth) ---
health_router = APIRouter(tags=["health"])


@health_router.get("/api/v1/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


# --- Auth endpoints (no auth required for these) ---
auth_router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@auth_router.get("/verify")
async def auth_verify(token: str = Depends(verify_token)):
    return {"status": "ok"}


@auth_router.get("/config")
async def auth_config():
    return {"auth_required": bool(settings.api_bearer_token)}


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(dashboard.router)
app.include_router(sessions.router)
app.include_router(cron.router)
app.include_router(analytics.router)
app.include_router(agents.router)
app.include_router(chat.router)
