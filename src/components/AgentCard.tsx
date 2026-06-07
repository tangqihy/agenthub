import { View, Text } from '@tarojs/components'
import type { Agent } from '../services/types'
import './AgentCard.scss'

interface Props {
  agent: Agent
  onClick?: () => void
}

const SCOPE_CONFIG: Record<string, { label: string; cls: string }> = {
  private: { label: '私有', cls: 'agent-card__scope--private' },
  family: { label: '家庭', cls: 'agent-card__scope--family' },
  public: { label: '公开', cls: 'agent-card__scope--public' },
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

export default function AgentCard({ agent, onClick }: Props) {
  const scope = SCOPE_CONFIG[agent.publish_scope] || SCOPE_CONFIG.private

  return (
    <View className='agent-card' onClick={onClick}>
      <View className='agent-card__avatar'>
        <Text className='agent-card__avatar-text'>{agent.avatar || '🤖'}</Text>
      </View>
      <View className='agent-card__content'>
        <View className='agent-card__header'>
          <Text className='agent-card__name'>{agent.name}</Text>
          <View className={`agent-card__scope ${scope.cls}`}>
            <Text>{scope.label}</Text>
          </View>
        </View>
        <Text className='agent-card__desc'>{agent.description || '暂无描述'}</Text>
        <View className='agent-card__meta'>
          <View className='agent-card__tag'>
            <Text>{agent.runtime}</Text>
          </View>
          <Text className='agent-card__version'>v{agent.current_version}</Text>
          <Text className='agent-card__time'>{formatTime(agent.updated_at)}</Text>
        </View>
      </View>
    </View>
  )
}
