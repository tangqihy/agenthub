import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { usePolling } from '../../hooks/usePolling'
import { api } from '../../services/api'
import SessionCard from '../../components/SessionCard'
import BottomNav from '../../components/BottomNav'
import SkeletonLoader from '../../components/SkeletonLoader'
import PageTransition from '../../components/PageTransition'
import '../../app.scss'

export default function SessionsPage() {
  const { data: sessions, loading, error, refresh } = usePolling(() => api.sessions({ limit: 50 }), 5000)

  return (
    <PageTransition>
      <View className='page'>
        {loading && !sessions && (
          <View className='section'>
            <SkeletonLoader rows={5} type='list' />
          </View>
        )}
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
    </PageTransition>
  )
}
