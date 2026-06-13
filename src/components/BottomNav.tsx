import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useIsMobile } from '../hooks/useIsMobile'
import './BottomNav.scss'

const TABS = [
  { path: '/pages/dashboard/index', label: '首页', icon: '📊' },
  { path: '/pages/sessions/index', label: 'Sessions', icon: '💬' },
  { path: '/pages/agents/index', label: 'Agents', icon: '🤖' },
  { path: '/pages/cron/index', label: 'Cron', icon: '⏰' },
  { path: '/pages/analytics/index', label: '统计', icon: '📈' },
]

export default function BottomNav({ active }: { active: string }) {
  const isMobile = useIsMobile()

  // Only render on mobile
  if (!isMobile) return null

  return (
    <View className='bottom-nav'>
      <View className='bottom-nav__inner'>
        {TABS.map((tab) => {
          const isActive = active === tab.path
          return (
            <View
              key={tab.path}
              className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
              onClick={() => Taro.reLaunch({ url: tab.path })}
            >
              <Text className='bottom-nav__icon'>{tab.icon}</Text>
              <Text className='bottom-nav__label'>{tab.label}</Text>
              {isActive && <View className='bottom-nav__indicator' />}
            </View>
          )
        })}
      </View>
    </View>
  )
}
