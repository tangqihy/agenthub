import { memo, useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import type { UIMessage } from '../../types/chat'
import './ToolActivityGroup.scss'

interface ToolActivityGroupProps {
  items: UIMessage[]
  active?: boolean
  showAvatar?: boolean
}

/** Inline SVG chevron that rotates on expand */
const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <View
    className={`tool-group-chevron ${expanded ? 'tool-group-chevron--expanded' : ''}`}
  >
    <View as='svg' style={{ width: 16, height: 16 }} viewBox='0 0 16 16'>
      <View
        as='path'
        d='M6 4l4 4-4 4'
        fill='none'
        stroke='currentColor'
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </View>
  </View>
)

/** Small status dot */
const StatusDot: React.FC<{ status?: string }> = ({ status }) => {
  const colorMap: Record<string, string> = {
    running: 'var(--color-blue, #3b82f6)',
    completed: 'var(--color-green, #22c55e)',
    failed: 'var(--color-red, #ef4444)',
  }
  return (
    <View
      className='tool-status-dot'
      style={{ backgroundColor: colorMap[status || 'completed'] || colorMap.completed }}
    />
  )
}

/** Spinner for active/streaming state */
const Spinner: React.FC = () => (
  <View className='tool-spinner'>
    <View className='tool-spinner-dot' />
    <View className='tool-spinner-dot' />
    <View className='tool-spinner-dot' />
  </View>
)

/** Individual tool call item */
const ToolItem: React.FC<{ item: UIMessage }> = ({ item }) => {
  const [expanded, setExpanded] = useState(false)
  const toolName = item.metadata?.toolName || item.metadata?.name || 'tool'
  const args = item.metadata?.args || item.metadata?.arguments || ''
  const result = item.metadata?.result || item.content || ''
  const status = item.metadata?.status || 'completed'
  const argsStr = typeof args === 'string' ? args : JSON.stringify(args, null, 2)
  const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  const argsPreview = argsStr.length > 80 ? argsStr.slice(0, 80) + '...' : argsStr

  const handleToggle = useCallback(() => setExpanded(prev => !prev), [])

  return (
    <View className='tool-item'>
      <View className='tool-item-header' onClick={handleToggle}>
        <StatusDot status={status} />
        <Text className='tool-item-name'>{toolName}</Text>
        {!expanded && (
          <Text className='tool-item-preview'>{argsPreview}</Text>
        )}
        <ChevronIcon expanded={expanded} />
      </View>
      {expanded && (
        <View className='tool-item-body'>
          {argsStr && (
            <View className='tool-item-section'>
              <Text className='tool-item-label'>Arguments</Text>
              <View className='tool-item-pre'>
                <Text>{argsStr}</Text>
              </View>
            </View>
          )}
          {resultStr && (
            <View className='tool-item-section'>
              <Text className='tool-item-label'>Result</Text>
              <View className='tool-item-pre'>
                <Text>{resultStr}</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const ToolActivityGroup: React.FC<ToolActivityGroupProps> = ({ items, active, showAvatar = true }) => {
  const [expanded, setExpanded] = useState(false)
  const count = items.length
  const toolName = items[0]?.metadata?.toolName || items[0]?.metadata?.name

  const handleToggle = useCallback(() => setExpanded(prev => !prev), [])

  const summaryText =
    count === 1 && toolName
      ? toolName
      : `${count} tool${count !== 1 ? 's' : ''} called`

  return (
    <View className={`tool-group ${active ? 'tool-group--active' : ''}`}>
      {showAvatar && (
        <View className='tool-group-avatar'>
          <Text className='tool-group-avatar-icon'>🔧</Text>
        </View>
      )}
      <View className='tool-group-content'>
        <View className='tool-group-summary' onClick={handleToggle}>
          {active ? (
            <Spinner />
          ) : (
            <ChevronIcon expanded={expanded} />
          )}
          <Text className='tool-group-summary-text'>{summaryText}</Text>
          {count > 1 && (
            <Text className='tool-group-step-count'>{count} steps</Text>
          )}
        </View>
        {expanded && (
          <View className='tool-collapse'>
            <View className='tool-group-items'>
              {items.map((item, idx) => (
                <ToolItem key={item.id || idx} item={item} />
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

export default memo(ToolActivityGroup)
export { ToolActivityGroup }
