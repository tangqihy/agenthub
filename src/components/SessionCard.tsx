import { View, Text } from '@tarojs/components'
import { Tag } from '@nutui/nutui-react-taro'
import { sessionLabel, type Session, formatTokens } from '../services/types'
import './SessionCard.scss'

interface Props {
  session: Session
  onClick?: () => void
}

export default function SessionCard({ session, onClick }: Props) {
  const tokens = session.input_tokens + session.output_tokens
  const label = sessionLabel(session)
  return (
    <View className='session-card' onClick={onClick}>
      <View className='session-card__header'>
        <Text className='session-card__title'>{session.title}</Text>
        <Tag type={session.is_active ? 'success' : 'default'}>{label}</Tag>
      </View>
      <View className='session-card__meta'>
        <Text>{session.source}</Text>
        <Text>{formatTokens(tokens)} tokens</Text>
      </View>
    </View>
  )
}
