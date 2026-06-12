import { memo, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import './ChatEmptyState.scss'

interface ChatEmptyStateProps {
  agentName?: string
  onSelectSuggestion?: (text: string) => void
}

const SUGGESTIONS = [
  '帮我写代码',
  '分析这段数据',
  '解释一下这个概念',
  '帮我写文档',
]

const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  agentName,
  onSelectSuggestion,
}) => {
  return (
    <View className='empty-state'>
      <View className='empty-icon'>
        <Text className='empty-icon-emoji'>🤖</Text>
      </View>

      <Text className='empty-title'>开始对话</Text>

      <Text className='empty-desc'>
        向 {agentName || '助手'} 发送消息
      </Text>

      <View className='suggestions-grid'>
        {SUGGESTIONS.map(text => (
          <SuggestionCard
            key={text}
            text={text}
            onSelect={onSelectSuggestion}
          />
        ))}
      </View>
    </View>
  )
}

/** Individual suggestion card */
const SuggestionCard: React.FC<{
  text: string
  onSelect?: (text: string) => void
}> = memo(({ text, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect?.(text)
  }, [text, onSelect])

  return (
    <View className='suggestion-card' onClick={handleClick}>
      <Text className='suggestion-card-text'>{text}</Text>
    </View>
  )
})

export default memo(ChatEmptyState)
export { ChatEmptyState }
