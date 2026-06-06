import { View, Text } from '@tarojs/components'
import type { Event } from '../services/types'
import './EventTimeline.scss'

interface Props {
  events: Event[]
}

function renderContent(event: Event) {
  const p = event.payload
  switch (event.event_type) {
    case 'user_message':
      return String(p.content || '')
    case 'assistant_message':
      return String(p.content || '')
    case 'tool_call':
      return `🔧 ${String(p.tool || 'tool')}: ${String(p.input || '').slice(0, 80)}`
    case 'tool_result':
      return `✅ ${String(p.tool || 'tool')}: ${String(p.result || '').slice(0, 80)}`
    case 'token_usage':
      return `Tokens: ${p.input_tokens || 0} in / ${p.output_tokens || 0} out`
    case 'error':
      return `❌ ${String(p.message || 'Error')}`
    default:
      return JSON.stringify(p).slice(0, 100)
  }
}

export default function EventTimeline({ events }: Props) {
  if (!events.length) {
    return <View className='timeline-empty'>暂无事件</View>
  }
  return (
    <View className='timeline'>
      {events.map((event) => (
        <View key={event.id} className={`timeline-item timeline-item--${event.event_type}`}>
          <Text className='timeline-item__type'>{event.event_type}</Text>
          <Text className='timeline-item__content'>{renderContent(event)}</Text>
        </View>
      ))}
    </View>
  )
}
