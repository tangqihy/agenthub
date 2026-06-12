import { memo, useState, useCallback, useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import './ReasoningRow.scss'

interface ReasoningRowProps {
  text: string
  active?: boolean
  showAvatar?: boolean
  lineCount?: number
}

const ReasoningRow: React.FC<ReasoningRowProps> = ({
  text,
  active = false,
  showAvatar = true,
  lineCount: lineCountProp,
}) => {
  const [expanded, setExpanded] = useState(false)

  const handleToggle = useCallback(() => setExpanded(prev => !prev), [])

  const lineCount = useMemo(() => {
    if (lineCountProp !== undefined) return lineCountProp
    if (!text) return 0
    return text.split('\n').length
  }, [text, lineCountProp])

  return (
    <View className={`reasoning-row ${active ? 'reasoning-row--active' : ''}`}>
      {showAvatar && (
        <View className='reasoning-avatar'>
          <Text className='reasoning-avatar-icon'>🧠</Text>
        </View>
      )}
      <View className='reasoning-content'>
        <View className='reasoning-summary' onClick={handleToggle}>
          {/* Chevron */}
          <View
            className={`reasoning-chevron ${expanded ? 'reasoning-chevron--expanded' : ''}`}
          >
            <View
              as='svg'
              style={{ width: 16, height: 16 }}
              viewBox='0 0 16 16'
            >
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

          {/* Brain icon */}
          <Text className='reasoning-brain-icon'>💭</Text>

          {/* Label */}
          <Text className='reasoning-label'>
            {active ? '思考中...' : '已思考'}
          </Text>

          {/* Line count */}
          {!active && lineCount > 0 && (
            <Text className='reasoning-line-count'>
              {lineCount} line{lineCount !== 1 ? 's' : ''}
            </Text>
          )}

          {/* Spinning dots when active */}
          {active && (
            <View className='reasoning-spinner'>
              <View className='reasoning-spinner-dot' />
              <View className='reasoning-spinner-dot' />
              <View className='reasoning-spinner-dot' />
            </View>
          )}
        </View>

        {/* Expandable content */}
        {expanded && text && (
          <View className='reasoning-expand'>
            <View className='reasoning-pre'>
              <Text>{text}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

export default memo(ReasoningRow)
export { ReasoningRow }
