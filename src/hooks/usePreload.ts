import { useEffect } from 'react'
import Taro from '@tarojs/taro'

const PRELOAD_MAP: Record<string, string[]> = {
  '/pages/dashboard/index': ['/pages/agents/index', '/pages/sessions/index'],
  '/pages/agents/index': ['/pages/agents/detail', '/pages/agents/editor'],
  '/pages/agents/detail': ['/pages/agents/editor'],
  '/pages/sessions/index': ['/pages/sessions/detail'],
}

export function usePreload(currentPath: string) {
  useEffect(() => {
    const targets = PRELOAD_MAP[currentPath]
    if (!targets) return
    // Preload after a short delay to not block initial render
    const timer = setTimeout(() => {
      targets.forEach(path => {
        try { Taro.preload({ url: path }) } catch {}
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [currentPath])
}
