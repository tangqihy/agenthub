import { useEffect, useState } from 'react'
import { api } from '../services/api'

export function useApiHealth(pollMs = 10000) {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        await api.health()
        if (!cancelled) setOnline(true)
      } catch {
        if (!cancelled) setOnline(false)
      }
    }
    check()
    const timer = setInterval(check, pollMs)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [pollMs])

  return online
}
