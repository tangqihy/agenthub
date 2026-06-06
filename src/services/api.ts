import Taro from '@tarojs/taro'
import type {
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

async function request<T>(url: string, options: Taro.request.Option = {}): Promise<T> {
  const res = await Taro.request({
    url: `${BASE}${url}`,
    ...options,
    header: {
      'Content-Type': 'application/json',
      ...(options.header || {}),
    },
  })
  if (res.statusCode >= 400) {
    throw new Error(`API ${res.statusCode}: ${url}`)
  }
  return res.data as T
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
}
