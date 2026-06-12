import { View, Text } from '@tarojs/components'
import { useState, useCallback } from 'react'
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
      return String(p.tool || p.name || 'tool')
    case 'tool_result':
      return String(p.tool || p.name || 'tool')
    case 'token_usage':
      return `${p.token_count || 0} tokens`
    case 'error':
      return String(p.message || 'Error')
    default:
      return JSON.stringify(p).slice(0, 80)
  }
}

// ── Tool group component (collapsible) ─────────────────────────────────────

interface ToolGroupProps {
  events: Event[]
}

const ToolEventGroup: React.FC<ToolGroupProps> = ({ events }) => {
  const [expanded, setExpanded] = useState(false)
  const count = events.length
  const handleToggle = useCallback(() => setExpanded((p) => !p), [])

  // Get tool name(s) for summary
  const toolNames = [...new Set(events.map((e) => String(e.payload.tool || e.payload.name || 'tool')))]
  const summary =
    count === 1
      ? toolNames[0]
      : `${count} 工具调用`

  return (
    <View className='timeline-item timeline-item--tool_group'>
      <View className='timeline-item__line' />
      <View className='timeline-item__dot'>
        <Text>🔧</Text>
      </View>
      <View className='timeline-item__content'>
        <View className='timeline-item__tool-group-header' onClick={handleToggle}>
          <Text className={`timeline-item__chevron ${expanded ? 'timeline-item__chevron--expanded' : ''}`}>
            ▶
          </Text>
          <Text className='timeline-item__label'>工具活动</Text>
          <Text className='timeline-item__tool-summary'>{summary}</Text>
          {count > 1 && (
            <Text className='timeline-item__tool-count'>{count} 步</Text>
          )}
        </View>
        {expanded && (
          <View className='timeline-item__tool-group-items'>
            {events.map((event, idx) => {
              const isCall = event.event_type === 'tool_call'
              const toolName = String(event.payload.tool || event.payload.name || 'tool')
              return (
                <View key={event.id} className='timeline-item__tool-item'>
                  <View className='timeline-item__tool-item-dot'>
                    <Text>{isCall ? '⚡' : '✅'}</Text>
                  </View>
                  <View className='timeline-item__tool-item-content'>
                    <Text className='timeline-item__tool-item-name'>{toolName}</Text>
                    <Text className='timeline-item__tool-item-type'>
                      {isCall ? '调用' : '结果'}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}

// ── Group consecutive tool events ──────────────────────────────────────────

type TimelineEntry =
  | { type: 'event'; event: Event }
  | { type: 'tool_group'; events: Event[] }

function groupToolEvents(events: Event[]): TimelineEntry[] {
  const result: TimelineEntry[] = []
  let toolBuffer: Event[] = []

  for (const event of events) {
    if (event.event_type === 'tool_call' || event.event_type === 'tool_result') {
      toolBuffer.push(event)
    } else {
      if (toolBuffer.length > 0) {
        result.push({ type: 'tool_group', events: toolBuffer })
        toolBuffer = []
      }
      result.push({ type: 'event', event })
    }
  }
  // Flush remaining tool events
  if (toolBuffer.length > 0) {
    result.push({ type: 'tool_group', events: toolBuffer })
  }

  return result
}

// ── Main timeline ──────────────────────────────────────────────────────────

export default function EventTimeline({ events }: Props) {
  if (!events.length) {
    return (
      <View className='timeline-empty'>
        <Text className='timeline-empty__icon'>📭</Text>
        <Text className='timeline-empty__text'>暂无事件</Text>
      </View>
    )
  }

  const entries = groupToolEvents(events)

  return (
    <View className='timeline'>
      {entries.map((entry, index) => {
        if (entry.type === 'tool_group') {
          return (
            <ToolEventGroup
              key={`tool-group-${entry.events[0]?.id || index}`}
              events={entry.events}
            />
          )
        }

        const event = entry.event
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
