import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import Layout from './index'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
}

// Route-to-path mapping for active state detection
const NAV_PATHS = [
  '/pages/dashboard/index',
  '/pages/chat/index',
  '/pages/sessions/index',
  '/pages/agents/index',
  '/pages/cron/index',
  '/pages/analytics/index',
  '/pages/skills/index',
  '/pages/settings/index',
]

function resolveActivePath(route: string): string {
  // Normalize the route path
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`

  // Direct match
  if (NAV_PATHS.includes(normalizedRoute)) {
    return normalizedRoute
  }

  // Prefix match (e.g., /pages/agents/detail matches /pages/agents/index)
  for (const navPath of NAV_PATHS) {
    const base = navPath.replace('/index', '')
    if (normalizedRoute.startsWith(base)) {
      return navPath
    }
  }

  return normalizedRoute
}

export default function AppLayout({ children, title, showBack }: AppLayoutProps) {
  const router = Taro.useRouter()
  const route = router.path || router.route || ''

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', savedTheme)
    }
  }, [])

  const activePath = resolveActivePath(route)

  return (
    <Layout
      activePath={activePath}
      title={title}
      showBack={showBack}
    >
      {children}
    </Layout>
  )
}
