import { View, Text } from '@tarojs/components'
import './OfflineBanner.scss'

interface Props {
  visible: boolean
  message?: string
}

export default function OfflineBanner({ visible, message = '网络连接已断开' }: Props) {
  if (!visible) return null

  return (
    <View className='offline-banner'>
      <View className='offline-banner__pulse' />
      <Text className='offline-banner__text'>⚠️ {message}</Text>
    </View>
  )
}
