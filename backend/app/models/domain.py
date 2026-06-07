from pydantic import BaseModel, Field


class Session(BaseModel):
    id: str
    external_id: str
    title: str
    source: str = "hermes"
    model: str | None = None
    started_at: int
    ended_at: int | None = None
    is_active: bool = True
    input_tokens: int = 0
    output_tokens: int = 0
    tool_calls: int = 0


class Event(BaseModel):
    id: str
    session_id: str
    timestamp: int
    event_type: str
    source: str = "hermes"
    payload: dict = Field(default_factory=dict)
    raw: dict | None = None


class CronJob(BaseModel):
    id: str
    name: str
    schedule: str
    status: str = "active"
    last_run_at: int | None = None
    next_run_at: int | None = None
    payload: dict = Field(default_factory=dict)


class Gateway(BaseModel):
    id: str
    platform: str
    status: str = "offline"
    last_seen: int = 0
    message_count: int = 0
    latency_ms: int | None = None
    error_count: int = 0


class UsageDaily(BaseModel):
    date: str
    source: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    cost: float = 0.0
    tool_calls: int = 0
    session_count: int = 0


class UsageSummary(BaseModel):
    today_tokens: int = 0
    week_tokens: int = 0
    month_tokens: int = 0
    today_cost: float = 0.0
    week_cost: float = 0.0
    month_cost: float = 0.0


class TopSession(BaseModel):
    session_id: str
    title: str
    tokens: int




class Agent(BaseModel):
    id: str
    name: str
    description: str = ""
    avatar: str = "🤖"
    runtime: str = "hermes"
    publish_scope: str = "private"
    current_version: int = 1
    created_at: int = 0
    updated_at: int = 0
    usage_count: int = 0
    last_used_at: int | None = None
    source_session_id: str | None = None
    derived_from_agent_id: str | None = None
    notes: str = ""
    use_cases: str = ""
    caveats: str = ""


class AgentVersion(BaseModel):
    id: str
    agent_id: str
    version: int
    config_json: dict = Field(default_factory=dict)
    created_at: int = 0


class AgentRun(BaseModel):
    id: str
    agent_id: str
    runtime: str
    runtime_session_id: str | None = None
    status: str = "completed"
    started_at: int = 0
    ended_at: int | None = None

class DashboardData(BaseModel):
    usage: UsageSummary
    by_source: list[dict]
    active_sessions: list[Session]
    top_sessions: list[TopSession]
    gateways: list[Gateway]
    cron_summary: dict


class ChatMessage(BaseModel):
    id: str
    agent_id: str
    conversation_id: str
    role: str  # 'user' or 'assistant'
    content: str
    created_at: int = 0
