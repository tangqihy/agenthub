import { View, Text } from '@tarojs/components'
import AppLayout from '../../components/Layout/AppLayout'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { api } from '../../services/api'
import AgentCard from '../../components/AgentCard'
import BottomNav from '../../components/BottomNav'
import '../../app.scss'
import './catalog.scss'

const SORT_TABS = [
  { key: 'recent', label: '最近使用' },
  { key: 'usage', label: '使用次数' },
  { key: 'updated', label: '最近更新' },
]

export default function AgentCatalogPage() {
  const [sort, setSort] = useState('recent')

  const { data: agents, loading } = usePolling(
    () => api.agentCatalog(sort),
    10000,
  )

  return (
      <AppLayout>
    <View className='page'>
      <View className='catalog-header'>
        <Text className='catalog-title'>📚 Agent 目录</Text>
      </View>

      <View className='catalog-tabs'>
        {SORT_TABS.map((tab) => (
          <View
            key={tab.key}
            className={`catalog-tab ${sort === tab.key ? 'catalog-tab--active' : ''}`}
            onClick={() => setSort(tab.key)}
          >
            <Text className='catalog-tab__text'>{tab.label}</Text>
          </View>
        ))}
      </View>

      <View className='catalog-list'>
        {loading && !agents && (
          <>
            <View className='skeleton skeleton-card' />
            <View className='skeleton skeleton-card' />
            <View className='skeleton skeleton-card' />
          </>
        )}
        {agents && agents.length === 0 && (
          <View className='catalog-empty'>
            <Text className='catalog-empty__icon'>📭</Text>
            <Text className='catalog-empty__text'>暂无公开 Agent</Text>
            <Text className='catalog-empty__hint'>发布 Agent 后将出现在目录中</Text>
          </View>
        )}
        {agents?.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onClick={() => Taro.navigateTo({ url: `/pages/agents/detail?id=${agent.id}` })}
          />
        ))}
      </View>

      <BottomNav active='/pages/agents/index' />
    </View>
      </AppLayout>)
}
