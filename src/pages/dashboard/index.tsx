import { View, Text } from '@tarojs/components'
import { usePolling } from '../../hooks/usePolling'
import { api } from '../../services/api'
import { formatTokens } from '../../services/types'
import TokenCard from '../../components/TokenCard'
import SessionCard from '../../components/SessionCard'
import GatewayBadge from '../../components/GatewayBadge'
import BottomNav from '../../components/BottomNav'
import Taro from '@tarojs/taro'
import '../../app.scss'

export default function DashboardPage() {
  const { data, loading, error } = usePolling(() => api.dashboard(), 5000)

  if (loading && !data) return <View className='page'>加载中...</View>
  if (error) return <View className='page'>错误: {error}</View>
  if (!data) return <View className='page'>无数据</View>

  const { usage, by_source, active_sessions, top_sessions, gateways, cron_summary } = data

  return (
    <View className='page'>
      <View className='section'>
        <Text className='section__title'>Token 概览</Text>
        <View className='token-row'>
          <TokenCard label='今日' tokens={usage.today_tokens} cost={usage.today_cost} />
          <TokenCard label='本周' tokens={usage.week_tokens} cost={usage.week_cost} />
          <TokenCard label='本月' tokens={usage.month_tokens} cost={usage.month_cost} />
        </View>
      </View>

      <View className='section'>
        <Text className='section__title'>Source 占比</Text>
        {by_source.map((item) => (
          <View key={item.source} className='source-row'>
            <Text>{item.source}</Text>
            <Text>{formatTokens(item.tokens)}</Text>
          </View>
        ))}
      </View>

      <View className='section'>
        <Text className='section__title'>最近活跃 Session</Text>
        {active_sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            onClick={() => Taro.navigateTo({ url: `/pages/sessions/detail?id=${s.id}` })}
          />
        ))}
      </View>

      <View className='section'>
        <Text className='section__title'>最耗 Token Top 10</Text>
        {top_sessions.map((s, i) => (
          <View key={s.session_id} className='top-row'>
            <Text>{i + 1}. {s.title}</Text>
            <Text>{formatTokens(s.tokens)}</Text>
          </View>
        ))}
      </View>

      <View className='section'>
        <Text className='section__title'>Gateway 状态</Text>
        {gateways.map((g) => (
          <GatewayBadge key={g.id} gateway={g} />
        ))}
      </View>

      <View className='section'>
        <Text className='section__title'>Cron 状态</Text>
        <View className='cron-stat'>
          <Text>运行中: {cron_summary.active}</Text>
          <Text>已暂停: {cron_summary.paused}</Text>
        </View>
      </View>

      <BottomNav active='/pages/dashboard/index' />
    </View>
  )
}
