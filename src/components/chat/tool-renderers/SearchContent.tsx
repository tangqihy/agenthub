/**
 * SearchContent - 搜索结果展示
 */
import { View, Text } from '@tarojs/components'
import type { UIMessage } from '../../../types/chat'
import './SearchContent.scss'

interface SearchContentProps {
  message: UIMessage
}

export function SearchContent({ message }: SearchContentProps) {
  const query = message.toolInput?.query || message.toolInput?.pattern || ''
  const content = message.toolResult?.content || ''
  const hasError = message.toolError
  
  // Parse search results
  const results = content.split('\n').filter(line => line.trim())
  
  return (
    <View className='search-content'>
      {/* Query */}
      {query && (
        <View className='search-query'>
          <Text className='query-icon'>🔍</Text>
          <Text className='query-text'>{query}</Text>
        </View>
      )}
      
      {/* Results */}
      {results.length > 0 && (
        <View className='search-results'>
          {results.map((line, i) => (
            <View key={i} className='search-result-item'>
              <Text className='result-text'>{line}</Text>
            </View>
          ))}
        </View>
      )}
      
      {/* No results */}
      {results.length === 0 && !hasError && (
        <View className='search-empty'>
          <Text className='empty-text'>无搜索结果</Text>
        </View>
      )}
      
      {/* Error */}
      {hasError && (
        <View className='search-error'>
          <Text className='error-text'>{message.toolResult?.error || '搜索失败'}</Text>
        </View>
      )}
    </View>
  )
}
