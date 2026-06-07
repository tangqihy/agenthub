import { useCallback, useEffect, useRef, useState } from 'react'
import { perf } from '../services/perf'

interface PollingResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  isRefreshing: boolean
}

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 5000, enabled = true): PollingResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const fetcherRef = useRef(fetcher)
  const hasDataRef = useRef(false)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    const isFirstLoad = !hasDataRef.current
    if (!isFirstLoad) setIsRefreshing(true)
    const pollStart = performance.now()
    try {
      setError(null)
      const result = await fetcherRef.current()
      hasDataRef.current = true
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      perf.trackApi('polling', performance.now() - pollStart)
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    setLoading(true)
    refresh()
    const timer = setInterval(refresh, intervalMs)
    return () => clearInterval(timer)
  }, [enabled, intervalMs, refresh])

  return { data, loading, error, refresh, isRefreshing }
}
