/**
 * ThinkingBlock - 思考过程展示
 * Based on harnss ThinkingBlock, adapted for Taro
 */
import { View, Text } from '@tarojs/components'
import { useState, useCallback } from 'react'
import './ThinkingBlock.scss'

interface ThinkingBlockProps {
  thinking: string
  isComplete?: boolean
  isStreaming?: boolean
  defaultExpanded?: boolean
}

export function ThinkingBlock({
  thinking,
  isComplete = false,
  isStreaming = false,
  defaultExpanded = false
}: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  
  const toggleExpand = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])
  
  if (!thinking) return null
  
  // Truncate for preview
  const previewText = thinking.length > 100 
    ? thinking.slice(0, 100) + '...' 
    : thinking
  
  return (
    <View className='thinking-block'>
      {/* Header */}
      <View className='thinking-header' onClick={toggleExpand}>
        <View className='thinking-info'>
          <Text className='thinking-icon'>💭</Text>
          <Text className='thinking-label'>
            {isStreaming ? '思考中...' : isComplete ? '思考过程' : '思考中...'}
          </Text>
          {isStreaming && <View className='thinking-spinner' />}
        </View>
        <View className='thinking-toggle'>
          <Text className='toggle-icon'>{expanded ? '▼' : '▶'}</Text>
        </View>
      </View>
      
      {/* Preview (when collapsed) */}
      {!expanded && (
        <View className='thinking-preview'>
          <Text className='preview-text'>{previewText}</Text>
        </View>
      )}
      
      {/* Full content (when expanded) */}
      {expanded && (
        <View className='thinking-content'>
          <Text userSelect>{thinking}</Text>
        </View>
      )}
    </View>
  )
}
