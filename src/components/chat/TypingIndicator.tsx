import { memo } from 'react'
import { View } from '@tarojs/components'
import './TypingIndicator.scss'

const TypingIndicator: React.FC = () => {
  return (
    <View className='typing-indicator'>
      <View className='typing-dot' />
      <View className='typing-dot' />
      <View className='typing-dot' />
    </View>
  )
}

export default memo(TypingIndicator)
export { TypingIndicator }
