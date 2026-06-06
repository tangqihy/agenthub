import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { usePolling } from '../../hooks/usePolling'
import { api } from '../../services/api'
import SessionCard from '../../components/SessionCard'
import BottomNav from '../../components/BottomNav'
import '../../app.scss'

export default function SessionsPage() {
  const { data: sessions, loading, error, refresh } = usePolling(() => api.sessions({ limit: 50 }), 5000)

  return (
    <View className='page'>
      {loading && !sessions && <View>加载中...</View>}
      {error && <View>{error}</View>}
      {sessions?.map((s) => (
        <SessionCard
          key={s.id}
          session={s}
          onClick={() => Taro.navigateTo({ url: `/pages/sessions/detail?id=${s.id}` })}
        />
      ))}
      <BottomNav active='/pages/sessions/index' />
    </View>
  )
}
