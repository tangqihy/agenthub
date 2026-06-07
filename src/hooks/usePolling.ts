import { useCallback, useEffect, useRef, useState } from 'react'

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 5000, enabled = true) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const result = await fetcherRef.current()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // fetcher 变化时立即重新拉取（runtime/search 等过滤条件变化）
  useEffect(() => {
    if (!enabled) return
    setLoading(true)
    refresh()
    const timer = setInterval(refresh, intervalMs)
    return () => clearInterval(timer)
  }, [enabled, intervalMs, refresh, fetcher])

  return { data, loading, error, refresh }
}
