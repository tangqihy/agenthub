import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.deps import get_state
from app.models.domain import Agent, AgentRun, AgentVersion

router = APIRouter(prefix="/api/v2/agents", tags=["agents-v2"])


# --- Request/Response Models ---

class AgentCreate(BaseModel):
    name: str
    description: str = ""
    avatar: str = "🤖"
    runtime: str = "hermes"
    config: dict | None = None  # 初始版本 config，不传则用默认


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    avatar: str | None = None
    publish_scope: str | None = None


class VersionCreate(BaseModel):
    config_json: dict


class RunCreate(BaseModel):
    runtime: str
    runtime_session_id: str | None = None
    status: str = "completed"


def _new_id(prefix: str = "ag") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


# --- Agent CRUD ---

@router.get("", response_model=list[Agent])
async def list_agents(
    runtime: str | None = Query(default=None),
    scope: str | None = Query(default=None),
    q: str | None = Query(default=None),
    state=Depends(get_state),
):
    return await state.agents.list_all(runtime=runtime, scope=scope, q=q)


@router.post("", response_model=Agent, status_code=201)
async def create_agent(body: AgentCreate, state=Depends(get_state)):
    now = int(time.time())
    agent = Agent(
        id=_new_id(),
        name=body.name,
        description=body.description,
        avatar=body.avatar,
        runtime=body.runtime,
        publish_scope="private",
        current_version=1,
        created_at=now,
        updated_at=now,
    )
    await state.agents.create(agent)

    # 创建初始版本
    config = body.config or {"model": "", "prompt": "", "skills": [], "mcp": []}
    version = AgentVersion(
        id=_new_id("av"),
        agent_id=agent.id,
        version=1,
        config_json=config,
        created_at=now,
    )
    await state.agents.create_version(version)
    return agent


@router.get("/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str, state=Depends(get_state)):
    agent = await state.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=Agent)
async def update_agent(agent_id: str, body: AgentUpdate, state=Depends(get_state)):
    agent = await state.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    if body.name is not None:
        agent.name = body.name
    if body.description is not None:
        agent.description = body.description
    if body.avatar is not None:
        agent.avatar = body.avatar
    if body.publish_scope is not None:
        if body.publish_scope not in ("private", "family", "public"):
            raise HTTPException(400, "publish_scope must be private/family/public")
        agent.publish_scope = body.publish_scope
    agent.updated_at = int(time.time())
    await state.agents.update(agent)
    return agent


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(agent_id: str, state=Depends(get_state)):
    agent = await state.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    await state.agents.delete(agent_id)


# --- Agent Version ---

@router.get("/{agent_id}/versions", response_model=list[AgentVersion])
async def list_versions(agent_id: str, state=Depends(get_state)):
    if not await state.agents.get(agent_id):
        raise HTTPException(404, "Agent not found")
    return await state.agents.list_versions(agent_id)


@router.post("/{agent_id}/versions", response_model=AgentVersion, status_code=201)
async def create_version(agent_id: str, body: VersionCreate, state=Depends(get_state)):
    agent = await state.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    versions = await state.agents.list_versions(agent_id)
    next_version = (versions[0].version + 1) if versions else 1
    now = int(time.time())
    version = AgentVersion(
        id=_new_id("av"),
        agent_id=agent_id,
        version=next_version,
        config_json=body.config_json,
        created_at=now,
    )
    await state.agents.create_version(version)
    agent.current_version = next_version
    agent.updated_at = now
    await state.agents.update(agent)
    return version


@router.get("/{agent_id}/versions/{v}", response_model=AgentVersion)
async def get_version(agent_id: str, v: int, state=Depends(get_state)):
    version = await state.agents.get_version(agent_id, v)
    if not version:
        raise HTTPException(404, "Version not found")
    return version


@router.post("/{agent_id}/versions/{v}/rollback", response_model=Agent)
async def rollback_version(agent_id: str, v: int, state=Depends(get_state)):
    agent = await state.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    version = await state.agents.get_version(agent_id, v)
    if not version:
        raise HTTPException(404, "Version not found")
    agent.current_version = v
    agent.updated_at = int(time.time())
    await state.agents.update(agent)
    return agent


# --- Agent Clone ---

@router.post("/{agent_id}/clone", response_model=Agent, status_code=201)
async def clone_agent(agent_id: str, state=Depends(get_state)):
    agent = await state.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    current_version = await state.agents.get_version(agent_id, agent.current_version)
    now = int(time.time())
    new_agent = Agent(
        id=_new_id(),
        name=f"{agent.name} (副本)",
        description=agent.description,
        avatar=agent.avatar,
        runtime=agent.runtime,
        publish_scope="private",
        current_version=1,
        created_at=now,
        updated_at=now,
    )
    await state.agents.create(new_agent)
    new_version = AgentVersion(
        id=_new_id("av"),
        agent_id=new_agent.id,
        version=1,
        config_json=current_version.config_json if current_version else {},
        created_at=now,
    )
    await state.agents.create_version(new_version)
    return new_agent


# --- Agent Run ---

@router.get("/{agent_id}/runs", response_model=list[AgentRun])
async def list_runs(
    agent_id: str,
    limit: int = Query(default=20, le=100),
    state=Depends(get_state),
):
    if not await state.agents.get(agent_id):
        raise HTTPException(404, "Agent not found")
    return await state.agents.list_runs(agent_id, limit)


@router.post("/{agent_id}/runs", response_model=AgentRun, status_code=201)
async def create_run(agent_id: str, body: RunCreate, state=Depends(get_state)):
    if not await state.agents.get(agent_id):
        raise HTTPException(404, "Agent not found")
    now = int(time.time())
    run = AgentRun(
        id=_new_id("ar"),
        agent_id=agent_id,
        runtime=body.runtime,
        runtime_session_id=body.runtime_session_id,
        status=body.status,
        started_at=now,
        ended_at=now if body.status != "running" else None,
    )
    await state.agents.create_run(run)
    return run


# --- Agent ↔ Session 关联 ---

@router.get("/{agent_id}/sessions")
async def list_agent_sessions(
    agent_id: str,
    limit: int = Query(default=20, le=100),
    state=Depends(get_state),
):
    """通过 agent_runs 反查关联的 Hermes sessions"""
    if not await state.agents.get(agent_id):
        raise HTTPException(404, "Agent not found")
    runs = await state.agents.list_runs(agent_id, limit=100)
    sessions = []
    for run in runs:
        if run.runtime == "hermes" and run.runtime_session_id:
            session = await state.sessions.get(run.runtime_session_id)
            if session:
                sessions.append(session)
    return sessions[:limit]
