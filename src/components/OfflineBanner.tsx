import { View, Text } from '@tarojs/components'

export default function OfflineBanner() {
  return (
    <View style={{ background: '#fff1f0', padding: '8px 12px', marginBottom: 8 }}>
      <Text style={{ color: '#ee0a24', fontSize: 13 }}>控制服务离线，请检查 Backend API</Text>
    </View>
  )
}
