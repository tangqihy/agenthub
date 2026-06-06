import { View, Text } from '@tarojs/components'
import type { Event } from '../services/types'
import './EventTimeline.scss'

interface Props {
  events: Event[]
}

const EVENT_CONFIG: Record<string, { icon: string; label: string }> = {
  user_message: { icon: '👤', label: '用户消息' },
  assistant_message: { icon: '🤖', label: '助手回复' },
  tool_call: { icon: '🔧', label: '工具调用' },
  tool_result: { icon: '✅', label: '工具结果' },
  token_usage: { icon: '📊', label: 'Token 消耗' },
  error: { icon: '❌', label: '错误' },
}

function renderContent(event: Event) {
  const p = event.payload
  switch (event.event_type) {
    case 'user_message':
      return String(p.content || '').slice(0, 200)
    case 'assistant_message':
      return String(p.content || '').slice(0, 200)
    case 'tool_call':
      return String(p.tool || 'tool')
    case 'tool_result':
      return String(p.tool || 'tool')
    case 'token_usage':
      return `${p.token_count || 0} tokens`
    case 'error':
      return String(p.message || 'Error')
    default:
      return JSON.stringify(p).slice(0, 80)
  }
}

export default function EventTimeline({ events }: Props) {
  if (!events.length) {
    return (
      <View className='timeline-empty'>
        <Text className='timeline-empty__icon'>📭</Text>
        <Text className='timeline-empty__text'>暂无事件</Text>
      </View>
    )
  }

  return (
    <View className='timeline'>
      {events.map((event, index) => {
        const config = EVENT_CONFIG[event.event_type] || { icon: '📌', label: event.event_type }
        return (
          <View
            key={event.id}
            className={`timeline-item timeline-item--${event.event_type}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <View className='timeline-item__line' />
            <View className='timeline-item__dot'>
              <Text>{config.icon}</Text>
            </View>
            <View className='timeline-item__content'>
              <Text className='timeline-item__label'>{config.label}</Text>
              <Text className='timeline-item__text'>{renderContent(event)}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}
