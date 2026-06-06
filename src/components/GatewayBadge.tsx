import { View, Text } from '@tarojs/components'
import type { Gateway } from '../services/types'
import './GatewayBadge.scss'

const PLATFORM_LABEL: Record<string, string> = {
  wechat: '微信',
  feishu: '飞书',
  webhook: 'Webhook',
}

export default function GatewayBadge({ gateway }: { gateway: Gateway }) {
  const online = gateway.status === 'online'
  return (
    <View className='gateway-badge'>
      <Text className='gateway-badge__name'>
        {online ? '🟢' : '🔴'} {PLATFORM_LABEL[gateway.platform] || gateway.platform}
      </Text>
      <Text className='gateway-badge__meta'>
        延迟 {gateway.latency_ms ?? '-'}ms · 错误 {gateway.error_count}
      </Text>
    </View>
  )
}
