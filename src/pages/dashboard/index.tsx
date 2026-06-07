import { View, Text } from '@tarojs/components'
import { useEffect } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { api } from '../../services/api'
import { formatTokens } from '../../services/types'
import TokenCard from '../../components/TokenCard'
import SessionCard from '../../components/SessionCard'
import AgentCard from '../../components/AgentCard'
import GatewayBadge from '../../components/GatewayBadge'
import BottomNav from '../../components/BottomNav'
import SkeletonLoader from '../../components/SkeletonLoader'
import PageTransition from '../../components/PageTransition'
import Taro from '@tarojs/taro'
import '../../app.scss'
import './index.scss'

export default function DashboardPage() {
  // Auth check on mount
  useEffect(() => {
    api.authConfig().then((config) => {
      if (config.auth_required) {
        api.authVerify().catch(() => {
          Taro.reLaunch({ url: '/pages/login/index' })
        })
      }
    }).catch(() => {})
  }, [])

  const { data, loading, error } = usePolling(() => api.dashboard(), 5000)
  const { data: agentsData } = usePolling(() => api.agents(), 10000)
  const agents = agentsData?.slice(0, 5)

  if (loading && !data) {
    return (
      <View className='page'>
        <View className='dashboard-header'>
          <Text className='dashboard-header__title'>AgentHub</Text>
          <Text className='dashboard-header__subtitle'>加载中...</Text>
        </View>
        <View className='section'>
          <SkeletonLoader rows={3} type='card' />
        </View>
        <View className='section'>
          <SkeletonLoader rows={4} type='list' />
        </View>
        <View className='section'>
          <SkeletonLoader rows={3} type='list' />
        </View>
        <BottomNav active='/pages/dashboard/index' />
      </View>
    )
  }

  if (error) {
    return (
      <View className='page'>
        <View className='dashboard-header'>
          <Text className='dashboard-header__title'>AgentHub</Text>
          <Text className='dashboard-header__error'>⚠️ {error}</Text>
        </View>
        <BottomNav active='/pages/dashboard/index' />
      </View>
    )
  }

  if (!data) return <View className='page'>无数据</View>

  const { usage, by_source, active_sessions, top_sessions, gateways, cron_summary } = data

  return (
    <PageTransition>
      <View className='page'>
        {/* Header */}
        <View className='dashboard-header'>
          <Text className='dashboard-header__title'>AgentHub</Text>
          <Text className='dashboard-header__subtitle'>Hermes 可视化面板</Text>
        </View>

        {/* Token Overview */}
        <View className='section'>
          <Text className='section__title'>Token 概览</Text>
          <View className='token-row'>
            <TokenCard label='今日' tokens={usage.today_tokens} cost={usage.today_cost} variant='primary' />
            <TokenCard label='本周' tokens={usage.week_tokens} cost={usage.week_cost} variant='success' />
            <TokenCard label='本月' tokens={usage.month_tokens} cost={usage.month_cost} variant='warning' />
          </View>
        </View>

        {/* Source Distribution */}
        <View className='section'>
          <Text className='section__title'>来源分布</Text>
          <View className='source-bars'>
            {by_source.map((item, index) => {
              const total = by_source.reduce((sum, s) => sum + s.tokens, 0)
              const percent = total > 0 ? (item.tokens / total) * 100 : 0
              return (
                <View key={item.source} className='source-bar' style={{ animationDelay: `${index * 100}ms` }}>
                  <View className='source-bar__header'>
                    <Text className='source-bar__name'>{item.source}</Text>
                    <Text className='source-bar__value'>{formatTokens(item.tokens)}</Text>
                  </View>
                  <View className='source-bar__track'>
                    <View
                      className='source-bar__fill'
                      style={{ width: `${percent}%` }}
                    />
                  </View>
                </View>
              )
            })}
          </View>
        </View>

        {/* Active Sessions */}
        <View className='section'>
          <View className='section__header'>
            <Text className='section__title'>活跃 Session</Text>
            <Text className='section__more' onClick={() => Taro.reLaunch({ url: '/pages/sessions/index' })}>
              查看全部 →
            </Text>
          </View>
          {active_sessions.length > 0 ? (
            active_sessions.slice(0, 5).map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onClick={() => Taro.navigateTo({ url: `/pages/sessions/detail?id=${s.id}` })}
              />
            ))
          ) : (
            <View className='empty-state'>
              <Text className='empty-state__icon'>💤</Text>
              <Text className='empty-state__text'>暂无活跃 Session</Text>
            </View>
          )}
        </View>

        {/* Recent Agents */}
        <View className='section'>
          <View className='section__header'>
            <Text className='section__title'>最近 Agent</Text>
            <Text className='section__more' onClick={() => Taro.reLaunch({ url: '/pages/agents/index' })}>
              查看全部 →
            </Text>
          </View>
          {agents && agents.length > 0 ? (
            agents.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                onClick={() => Taro.navigateTo({ url: `/pages/agents/detail?id=${a.id}` })}
              />
            ))
          ) : (
            <View className='empty-state'>
              <Text className='empty-state__icon'>🤖</Text>
              <Text className='empty-state__text'>暂无 Agent</Text>
            </View>
          )}
        </View>

        {/* Top Sessions */}
        <View className='section'>
          <Text className='section__title'>最耗 Token Top 10</Text>
          {top_sessions.map((s, i) => (
            <View key={s.session_id} className='top-row' style={{ animationDelay: `${i * 60}ms` }}>
              <Text className='top-row__rank'>#{i + 1}</Text>
              <Text className='top-row__name'>{s.title}</Text>
              <Text className='top-row__tokens'>{formatTokens(s.tokens)}</Text>
            </View>
          ))}
        </View>

        {/* Gateways */}
        <View className='section'>
          <Text className='section__title'>Gateway 状态</Text>
          {gateways.map((g) => (
            <GatewayBadge key={g.id} gateway={g} />
          ))}
        </View>

        {/* Cron Summary */}
        <View className='section'>
          <Text className='section__title'>定时任务</Text>
          <View className='cron-summary'>
            <View className='cron-summary__item'>
              <View className='cron-summary__dot cron-summary__dot--active' />
              <Text className='cron-summary__label'>运行中</Text>
              <Text className='cron-summary__value'>{cron_summary.active}</Text>
            </View>
            <View className='cron-summary__item'>
              <View className='cron-summary__dot cron-summary__dot--paused' />
              <Text className='cron-summary__label'>已暂停</Text>
              <Text className='cron-summary__value'>{cron_summary.paused}</Text>
            </View>
          </View>
        </View>

        <BottomNav active='/pages/dashboard/index' />
      </View>
    </PageTransition>
  )
}
