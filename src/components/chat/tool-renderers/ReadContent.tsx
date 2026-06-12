/**
 * ReadContent - 文件读取展示
 */
import { View, Text } from '@tarojs/components'
import { useState, useMemo } from 'react'
import type { UIMessage } from '../../../types/chat'
import './ReadContent.scss'

interface ReadContentProps {
  message: UIMessage
}

const MAX_LINES = 100

export function ReadContent({ message }: ReadContentProps) {
  const [expanded, setExpanded] = useState(false)
  
  const filePath = message.toolInput?.file_path || message.toolInput?.path || ''
  const content = message.toolResult?.content || ''
  const hasError = message.toolError
  
  // Parse content
  const { displayContent, totalLines, isTruncated } = useMemo(() => {
    if (!content) return { displayContent: '', totalLines: 0, isTruncated: false }
    
    const lines = content.split('\n')
    const total = lines.length
    
    if (expanded || total <= MAX_LINES) {
      return { displayContent: content, totalLines: total, isTruncated: false }
    }
    
    return {
      displayContent: lines.slice(0, MAX_LINES).join('\n'),
      totalLines: total,
      isTruncated: true
    }
  }, [content, expanded])
  
  return (
    <View className='read-content'>
      {/* File path */}
      {filePath && (
        <View className='read-file-path'>
          <Text className='file-icon'>📄</Text>
          <Text className='file-path'>{filePath}</Text>
        </View>
      )}
      
      {/* Content */}
      {displayContent && (
        <View className={`read-file-content ${hasError ? 'read-error' : ''}`}>
          <Text userSelect>{displayContent}</Text>
        </View>
      )}
      
      {/* Truncation indicator */}
      {isTruncated && (
        <View 
          className='read-truncated' 
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(true)
          }}
        >
          <Text className='truncated-text'>
            ... 还有 {totalLines - MAX_LINES} 行，点击展开
          </Text>
        </View>
      )}
      
      {/* Error */}
      {hasError && !content && (
        <View className='read-error-content'>
          <Text className='error-text'>{message.toolResult?.error || '读取失败'}</Text>
        </View>
      )}
    </View>
  )
}
