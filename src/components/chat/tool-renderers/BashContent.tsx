/**
 * BashContent - 命令执行结果展示
 * Based on harnss BashContent, adapted for Taro
 */
import { View, Text } from '@tarojs/components'
import { useState, useMemo } from 'react'
import type { UIMessage } from '../../../types/chat'
import './BashContent.scss'

interface BashContentProps {
  message: UIMessage
}

const MAX_OUTPUT_LINES = 50

export function BashContent({ message }: BashContentProps) {
  const [expanded, setExpanded] = useState(false)
  
  const command = message.toolInput?.command as string | undefined
  const result = message.toolResult?.content || ''
  const hasError = message.toolError
  
  // Parse output
  const { displayText, totalLines, isTruncated } = useMemo(() => {
    if (!result) return { displayText: '', totalLines: 0, isTruncated: false }
    
    const lines = result.split('\n')
    const total = lines.length
    
    if (expanded || total <= MAX_OUTPUT_LINES) {
      return { displayText: result, totalLines: total, isTruncated: false }
    }
    
    return {
      displayText: lines.slice(0, MAX_OUTPUT_LINES).join('\n'),
      totalLines: total,
      isTruncated: true
    }
  }, [result, expanded])
  
  return (
    <View className='bash-content'>
      {/* Command */}
      {command && (
        <View className='bash-command'>
          <Text className='prompt'>$</Text>
          <Text className='command-text'>{command}</Text>
        </View>
      )}
      
      {/* Output */}
      {displayText && (
        <View className={`bash-output ${hasError ? 'bash-error' : ''}`}>
          <Text userSelect>{displayText}</Text>
        </View>
      )}
      
      {/* Truncation indicator */}
      {isTruncated && (
        <View 
          className='bash-truncated' 
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(true)
          }}
        >
          <Text className='truncated-text'>
            ... 还有 {totalLines - MAX_OUTPUT_LINES} 行，点击展开
          </Text>
        </View>
      )}
      
      {/* No output */}
      {!result && !hasError && (
        <View className='bash-empty'>
          <Text className='empty-text'>(无输出)</Text>
        </View>
      )}
    </View>
  )
}
