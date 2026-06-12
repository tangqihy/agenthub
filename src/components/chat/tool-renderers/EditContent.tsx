/**
 * EditContent - 文件编辑diff展示
 * Based on harnss EditContent, adapted for Taro
 */
import { View, Text } from '@tarojs/components'
import { useMemo } from 'react'
import type { UIMessage } from '../../../types/chat'
import './EditContent.scss'

interface EditContentProps {
  message: UIMessage
}

// Parse simple diff format
function parseDiff(diffText: string): Array<{ type: 'add' | 'remove' | 'context'; line: string }> {
  if (!diffText) return []
  
  return diffText.split('\n').map(line => {
    if (line.startsWith('+')) {
      return { type: 'add' as const, line: line.slice(1) }
    }
    if (line.startsWith('-')) {
      return { type: 'remove' as const, line: line.slice(1) }
    }
    return { type: 'context' as const, line }
  })
}

export function EditContent({ message }: EditContentProps) {
  const filePath = message.toolInput?.file_path || message.toolInput?.path || ''
  const oldString = message.toolInput?.old_string || message.toolInput?.oldStr || ''
  const newString = message.toolInput?.new_string || message.toolInput?.newStr || ''
  const diffText = message.toolResult?.content || ''
  
  // Parse diff if available
  const diffLines = useMemo(() => {
    if (diffText) return parseDiff(diffText)
    if (oldString && newString) {
      return [
        ...oldString.split('\n').map(line => ({ type: 'remove' as const, line })),
        ...newString.split('\n').map(line => ({ type: 'add' as const, line }))
      ]
    }
    return []
  }, [diffText, oldString, newString])
  
  // Count changes
  const addCount = diffLines.filter(l => l.type === 'add').length
  const removeCount = diffLines.filter(l => l.type === 'remove').length
  
  return (
    <View className='edit-content'>
      {/* File path */}
      {filePath && (
        <View className='edit-file-path'>
          <Text className='file-icon'>📄</Text>
          <Text className='file-path'>{filePath}</Text>
        </View>
      )}
      
      {/* Diff stats */}
      {(addCount > 0 || removeCount > 0) && (
        <View className='edit-stats'>
          <Text className='stat-add'>+{addCount}</Text>
          <Text className='stat-remove'>-{removeCount}</Text>
        </View>
      )}
      
      {/* Diff view */}
      {diffLines.length > 0 && (
        <View className='edit-diff'>
          {diffLines.map((line, i) => (
            <View key={i} className={`diff-line diff-${line.type}`}>
              <Text className='diff-marker'>
                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
              </Text>
              <Text className='diff-text'>{line.line}</Text>
            </View>
          ))}
        </View>
      )}
      
      {/* New file content (when no diff) */}
      {!diffLines.length && newString && (
        <View className='edit-new-file'>
          <Text className='new-file-label'>新文件内容:</Text>
          <View className='new-file-content'>
            <Text userSelect>{newString}</Text>
          </View>
        </View>
      )}
    </View>
  )
}
