/**
 * GenericContent - 通用工具结果展示
 */
import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import type { UIMessage } from '../../../types/chat'
import './GenericContent.scss'

interface GenericContentProps {
  message: UIMessage
}

export function GenericContent({ message }: GenericContentProps) {
  const [expanded, setExpanded] = useState(false)
  
  const toolName = message.toolName || 'unknown'
  const content = message.toolResult?.content || ''
  const error = message.toolResult?.error || ''
  const hasError = message.toolError
  
  // Format tool input
  const inputJson = message.toolInput 
    ? JSON.stringify(message.toolInput, null, 2) 
    : ''
  
  // Truncate content for preview
  const previewContent = content.length > 200 
    ? content.slice(0, 200) + '...' 
    : content
  
  return (
    <View className='generic-content'>
      {/* Tool input (if present) */}
      {inputJson && (
        <View className='generic-input'>
          <Text className='input-label'>输入参数:</Text>
          <View className='input-json'>
            <Text userSelect>{inputJson}</Text>
          </View>
        </View>
      )}
      
      {/* Result content */}
      {content && (
        <View className={`generic-result ${hasError ? 'generic-error' : ''}`}>
          <Text className='result-label'>执行结果:</Text>
          <View className='result-content'>
            <Text userSelect>{expanded ? content : previewContent}</Text>
          </View>
          {content.length > 200 && (
            <View 
              className='expand-btn' 
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(prev => !prev)
              }}
            >
              <Text className='expand-text'>
                {expanded ? '收起' : '展开全部'}
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* Error */}
      {error && (
        <View className='generic-error-content'>
          <Text className='error-label'>错误:</Text>
          <Text className='error-text'>{error}</Text>
        </View>
      )}
      
      {/* No content */}
      {!content && !error && (
        <View className='generic-empty'>
          <Text className='empty-text'>工具执行完成</Text>
        </View>
      )}
    </View>
  )
}
