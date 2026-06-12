import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import './index.scss'

export interface LayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
  activePath?: string
}

interface NavItem {
  path: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { path: '/pages/dashboard/index', label: '仪表盘', icon: '🏠' },
  { path: '/pages/chat/index', label: '对话', icon: '💬' },
  { path: '/pages/sessions/index', label: '会话', icon: '📋' },
  { path: '/pages/agents/index', label: 'Agent', icon: '🤖' },
  { path: '/pages/cron/index', label: '定时任务', icon: '⏰' },
  { path: '/pages/analytics/index', label: '分析', icon: '📊' },
  { path: '/pages/skills/index', label: '技能', icon: '🛠' },
  { path: '/pages/settings/index', label: '设置', icon: '⚙️' },
]

export default function Layout({ children, title, showBack, activePath }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    // Load collapsed state from localStorage
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsed === 'true') {
      setCollapsed(true)
    }

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const toggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  }

  const handleNavClick = (path: string) => {
    if (path === activePath) return
    Taro.redirectTo({ url: path })
  }

  const handleBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className={`layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <View className='sidebar'>
        {/* Brand Section */}
        <View className='sidebar-brand'>
          {showBack ? (
            <View className='sidebar-back' onClick={handleBack}>
              <Text className='sidebar-back-arrow'>←</Text>
              {!collapsed && <Text className='sidebar-logo'>{title || 'AgentHub'}</Text>}
            </View>
          ) : (
            <View className='sidebar-brand-content'>
              {!collapsed && <Text className='sidebar-logo'>AgentHub</Text>}
            </View>
          )}
          <View className='sidebar-collapse-toggle' onClick={toggleCollapse}>
            <Text className='sidebar-collapse-icon'>{collapsed ? '→' : '←'}</Text>
          </View>
        </View>

        {/* Navigation */}
        <View className='sidebar-nav'>
          {NAV_ITEMS.map((item) => {
            const isActive = activePath === item.path
            return (
              <View
                key={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
              >
                <Text className='nav-icon'>{item.icon}</Text>
                {!collapsed && <Text className='nav-label'>{item.label}</Text>}
              </View>
            )
          })}
        </View>

        {/* Footer - Theme Toggle */}
        <View className='sidebar-footer'>
          <View className='theme-toggle'>
            <View
              className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => toggleTheme('dark')}
            >
              <Text>🌙</Text>
            </View>
            <View
              className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => toggleTheme('light')}
            >
              <Text>☀️</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View className='main-content'>
        {children}
      </View>
    </View>
  )
}
