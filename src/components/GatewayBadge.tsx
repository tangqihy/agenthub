import { View, Text } from '@tarojs/components'
import type { Gateway } from '../services/types'
import './GatewayBadge.scss'

const PLATFORM_LABEL: Record<string, string> = {
  wechat: '微信',
  feishu: '飞书',
  webhook: 'Webhook',
}

const PLATFORM_ICON: Record<string, string> = {
  wechat: '💬',
  feishu: '🐦',
  webhook: '🔗',
}

export default function GatewayBadge({ gateway }: { gateway: Gateway }) {
  const online = gateway.status === 'online'
  const platform = gateway.platform

  return (
    <View className={`gateway-badge ${online ? 'gateway-badge--online' : 'gateway-badge--offline'}`}>
      <View className='gateway-badge__icon'>
        <Text>{PLATFORM_ICON[platform] || '🔌'}</Text>
      </View>
      <View className='gateway-badge__info'>
        <Text className='gateway-badge__name'>
          {PLATFORM_LABEL[platform] || platform}
        </Text>
        <Text className='gateway-badge__status'>
          {online ? '已连接' : '未连接'}
        </Text>
      </View>
      <View className='gateway-badge__indicator'>
        <View className='gateway-badge__dot' />
      </View>
    </View>
  )
}
