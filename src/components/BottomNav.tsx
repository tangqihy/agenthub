import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './BottomNav.scss'

const TABS = [
  { path: '/pages/dashboard/index', label: '首页' },
  { path: '/pages/sessions/index', label: 'Sessions' },
  { path: '/pages/cron/index', label: 'Cron' },
  { path: '/pages/analytics/index', label: 'Analytics' },
]

export default function BottomNav({ active }: { active: string }) {
  return (
    <View className='bottom-nav'>
      {TABS.map((tab) => (
        <Text
          key={tab.path}
          className={`bottom-nav__item ${active === tab.path ? 'bottom-nav__item--active' : ''}`}
          onClick={() => Taro.reLaunch({ url: tab.path })}
        >
          {tab.label}
        </Text>
      ))}
    </View>
  )
}
