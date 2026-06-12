import { View, Text, Input } from '@tarojs/components'
import AppLayout from '../../components/Layout/AppLayout'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { api } from '../../services/api'
import AgentCard from '../../components/AgentCard'
import BottomNav from '../../components/BottomNav'
import SkeletonLoader from '../../components/SkeletonLoader'
import PageTransition from '../../components/PageTransition'
import '../../app.scss'
import './index.scss'

const RUNTIME_TABS = [
  { key: '', label: '全部' },
  { key: 'hermes', label: 'Hermes' },
  { key: 'claude-code', label: 'Claude Code' },
  { key: 'codex', label: 'Codex' },
  { key: 'opencode', label: 'OpenCode' },
]

export default function AgentsPage() {
  const [search, setSearch] = useState('')
  const [runtime, setRuntime] = useState('')

  const { data: agents, loading } = usePolling(
    () => api.agents({ runtime: runtime || undefined, q: search || undefined }),
    5000,
  )

  return (
      <AppLayout>
    <PageTransition>
      <View className='page'>
        <View className='agents-header'>
          <Text className='agents-title'>🤖 Agent 注册中心</Text>
        </View>

        <View className='agents-search'>
          <Input
            className='agents-search__input'
            placeholder='搜索 Agent...'
            value={search}
            onInput={(e) => setSearch(e.detail.value)}
            confirmType='search'
          />
        </View>

        <View className='agents-tabs'>
          {RUNTIME_TABS.map((tab) => (
            <View
              key={tab.key}
              className={`agents-tab ${runtime === tab.key ? 'agents-tab--active' : ''}`}
              onClick={() => setRuntime(tab.key)}
            >
              <Text className='agents-tab__text'>{tab.label}</Text>
            </View>
          ))}
        </View>

        <View className='agents-list'>
          {loading && !agents && (
            <View className='section'>
              <SkeletonLoader rows={4} type='card' />
            </View>
          )}
          {!loading && agents && agents.length === 0 && (
            <View className='agents-empty'>
              <Text className='agents-empty__icon'>📭</Text>
              <Text className='agents-empty__text'>暂无 Agent</Text>
              <Text className='agents-empty__hint'>点击右下角按钮创建</Text>
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

        <View
          className='agents-fab'
          onClick={() => Taro.navigateTo({ url: '/pages/agents/editor' })}
        >
          <Text className='agents-fab__text'>＋</Text>
        </View>

        <BottomNav active='/pages/agents/index' />
      </View>
    </PageTransition>
      </AppLayout>)
}
