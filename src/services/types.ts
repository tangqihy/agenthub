export interface Session {
  id: string
  external_id: string
  title: string
  source: string
  model?: string | null
  started_at: number
  ended_at?: number | null
  is_active: boolean
  input_tokens: number
  output_tokens: number
  tool_calls: number
}

export interface Event {
  id: string
  session_id: string
  timestamp: number
  event_type: string
  source: string
  payload: Record<string, unknown>
  raw?: Record<string, unknown> | null
}

export interface CronJob {
  id: string
  name: string
  schedule: string
  status: string
  last_run_at?: number | null
  next_run_at?: number | null
  payload: Record<string, unknown>
}

export interface Gateway {
  id: string
  platform: string
  status: string
  last_seen: number
  message_count: number
  latency_ms?: number | null
  error_count: number
}

export interface UsageSummary {
  today_tokens: number
  week_tokens: number
  month_tokens: number
  today_cost: number
  week_cost: number
  month_cost: number
}

export interface TopSession {
  session_id: string
  title: string
  tokens: number
}

export interface DashboardData {
  usage: UsageSummary
  by_source: Array<{ source: string; tokens: number; cost: number }>
  active_sessions: Session[]
  top_sessions: TopSession[]
  gateways: Gateway[]
  cron_summary: {
    active: number
    paused: number
    recent: CronJob[]
  }
}

export interface UsageDaily {
  date: string
  source: string
  model: string
  input_tokens: number
  output_tokens: number
  cost: number
  tool_calls: number
  session_count: number
}

export function sessionLabel(session: Session): 'Active' | 'Archived' {
  return session.is_active ? 'Active' : 'Archived'
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export interface Agent {
  id: string
  name: string
  description: string
  avatar: string
  runtime: string  // 'hermes' | 'claude-code' | 'codex' | 'opencode' | 'custom'
  publish_scope: string  // 'private' | 'family' | 'public'
  current_version: number
  usage_count: number
  last_used_at?: number | null
  source_session_id?: string | null
  derived_from_agent_id?: string | null
  notes: string
  use_cases: string
  caveats: string
  created_at: number
  updated_at: number
}

export interface AgentVersion {
  id: string
  agent_id: string
  version: number
  config_json: {
    model?: string
    prompt?: string
    skills?: string[]
    mcp?: string[]
    runtime_config?: Record<string, unknown>
  }
  created_at: number
}

export interface AgentRun {
  id: string
  agent_id: string
  runtime: string
  runtime_session_id?: string | null
  status: string  // 'running' | 'completed' | 'failed'
  started_at: number
  ended_at?: number | null
}
