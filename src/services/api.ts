import Taro from '@tarojs/taro'
import { perf } from './perf'
import type {
  Agent,
  AgentRun,
  AgentVersion,
  CronJob,
  DashboardData,
  Event,
  Gateway,
  Session,
  TopSession,
  UsageDaily,
  UsageSummary,
} from './types'

const BASE = process.env.TARO_ENV === 'h5' ? '' : 'http://127.0.0.1:8000'

// Auth token management (module-level, no circular dependency with auth.ts)
let _token = ''
try { _token = Taro.getStorageSync('agenthub_token') || '' } catch {}

export function setAuthToken(token: string) {
  _token = token
}

export function getAuthToken(): string {
  return _token
}

async function request<T>(url: string, options: Taro.request.Option = {}): Promise<T> {
  const startTime = performance.now()
  const authHeader = _token ? { Authorization: `Bearer ${_token}` } : {}
  try {
    const res = await Taro.request({
      url: `${BASE}${url}`,
      ...options,
      header: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(options.header || {}),
      },
    })
    if (res.statusCode === 401) {
      _token = ''
      try { Taro.removeStorageSync('agenthub_token') } catch {}
      Taro.reLaunch({ url: '/pages/login/index' })
      throw new Error(`Unauthorized: ${url}`)
    }
    if (res.statusCode >= 400) {
      throw new Error(`API ${res.statusCode}: ${url}`)
    }
    return res.data as T
  } finally {
    perf.trackApi(url, performance.now() - startTime)
  }
}

export const api = {
  health: () => request<{ status: string }>('/api/v1/health'),
  dashboard: () => request<DashboardData>('/api/v1/dashboard'),
  sessions: (params?: { active?: boolean; source?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.active !== undefined) q.set('active', String(params.active))
    if (params?.source) q.set('source', params.source)
    if (params?.limit) q.set('limit', String(params.limit))
    const qs = q.toString()
    return request<Session[]>(`/api/v1/sessions${qs ? `?${qs}` : ''}`)
  },
  session: (id: string) => request<Session>(`/api/v1/sessions/${id}`),
  events: (id: string, since?: number) => {
    const qs = since ? `?since=${since}` : ''
    return request<Event[]>(`/api/v1/sessions/${id}/events${qs}`)
  },
  cronJobs: () => request<CronJob[]>('/api/v1/cron'),
  cronPause: (id: string) => request(`/api/v1/cron/${id}/pause`, { method: 'POST' }),
  cronResume: (id: string) => request(`/api/v1/cron/${id}/resume`, { method: 'POST' }),
  cronRun: (id: string) => request(`/api/v1/cron/${id}/run`, { method: 'POST' }),
  cronRemove: (id: string) => request(`/api/v1/cron/${id}`, { method: 'DELETE' }),
  analyticsSummary: () => request<UsageSummary>('/api/v1/analytics/summary'),
  analyticsDaily: () => request<UsageDaily[]>('/api/v1/analytics/daily'),
  analyticsBySource: () => request<Array<{ source: string; tokens: number; cost: number }>>('/api/v1/analytics/by-source'),
  analyticsByTool: () => request<Array<{ tool: string; calls: number }>>('/api/v1/analytics/by-tool'),
  analyticsByModel: () => request<Array<{ model: string; tokens: number; cost: number }>>('/api/v1/analytics/by-model'),
  topSessions: (limit = 10) => request<TopSession[]>(`/api/v1/analytics/top-sessions?limit=${limit}`),
  gateways: () => request<Gateway[]>('/api/v1/gateways'),

  // Agent CRUD
  agents: (params?: { runtime?: string; scope?: string; q?: string }) => {
    const q = new URLSearchParams()
    if (params?.runtime) q.set('runtime', params.runtime)
    if (params?.scope) q.set('scope', params.scope)
    if (params?.q) q.set('q', params.q)
    const qs = q.toString()
    return request<Agent[]>(`/api/v2/agents${qs ? `?${qs}` : ''}`)
  },
  agent: (id: string) => request<Agent>(`/api/v2/agents/${id}`),
  agentCreate: (data: { name: string; description?: string; avatar?: string; runtime?: string; config?: Record<string, unknown> }) =>
    request<Agent>('/api/v2/agents', { method: 'POST', data }),
  agentUpdate: (id: string, data: { name?: string; description?: string; avatar?: string; publish_scope?: string }) =>
    request<Agent>(`/api/v2/agents/${id}`, { method: 'PATCH', data }),
  agentDelete: (id: string) => request<void>(`/api/v2/agents/${id}`, { method: 'DELETE' }),

  // Agent Versions
  agentVersions: (agentId: string) => request<AgentVersion[]>(`/api/v2/agents/${agentId}/versions`),
  agentVersionCreate: (agentId: string, config_json: Record<string, unknown>) =>
    request<AgentVersion>(`/api/v2/agents/${agentId}/versions`, { method: 'POST', data: { config_json } }),
  agentVersionRollback: (agentId: string, v: number) =>
    request<Agent>(`/api/v2/agents/${agentId}/versions/${v}/rollback`, { method: 'POST' }),
  agentClone: (id: string) => request<Agent>(`/api/v2/agents/${id}/clone`, { method: 'POST' }),

  // Agent Runs
  agentRuns: (agentId: string, limit?: number) =>
    request<AgentRun[]>(`/api/v2/agents/${agentId}/runs${limit ? `?limit=${limit}` : ''}`),
  agentRunCreate: (agentId: string, data: { runtime: string; runtime_session_id?: string; status?: string }) =>
    request<AgentRun>(`/api/v2/agents/${agentId}/runs`, { method: 'POST', data }),

  // Agent Sessions
  agentSessions: (agentId: string, limit?: number) =>
    request<Session[]>(`/api/v2/agents/${agentId}/sessions${limit ? `?limit=${limit}` : ''}`),

  // V2.1 Agent Evolution
  agentFromSession: (sessionId: string) =>
    request<Agent>(`/api/v2/agents/from-session/${sessionId}`, { method: 'POST' }),

  agentCatalog: (sort: string = 'recent') =>
    request<Agent[]>(`/api/v2/agents/catalog?sort=${sort}`),

  agentTree: (id: string) =>
    request<{ agent: Agent; parent: Agent | null; children: Agent[] }>(`/api/v2/agents/${id}/tree`),

  // Chat
  agentChat: (agentId: string, message: string, conversationId?: string) =>
    request<{ reply: string; conversation_id: string; user_message_id: string; assistant_message_id: string }>(
      `/api/v2/agents/${agentId}/chat`,
      { method: 'POST', data: { message, conversation_id: conversationId } },
    ),
  agentConversations: (agentId: string) =>
    request<Array<{ conversation_id: string; last_message_at: number; message_count: number }>>(
      `/api/v2/agents/${agentId}/conversations`,
    ),
  agentConversation: (agentId: string, conversationId: string) =>
    request<{
      conversation_id: string
      messages: Array<{
        id: string
        role: string
        content: string
        created_at: number
        status: string
        error?: string | null
        metadata?: Record<string, unknown>
      }>
    }>(
      `/api/v2/agents/${agentId}/conversations/${conversationId}`,
    ),

  // Auth
  authVerify: () => request<{ status: string }>('/api/v1/auth/verify'),
  authConfig: () => request<{ auth_required: boolean }>('/api/v1/auth/config'),
}
