import { View, Text } from '@tarojs/components'
import { sessionLabel, type Session, formatTokens } from '../services/types'
import './SessionCard.scss'

interface Props {
  session: Session
  onClick?: () => void
}

export default function SessionCard({ session, onClick }: Props) {
  const tokens = session.input_tokens + session.output_tokens
  const label = sessionLabel(session)
  const isActive = session.is_active

  return (
    <View className={`session-card ${isActive ? 'session-card--active' : ''}`} onClick={onClick}>
      <View className='session-card__indicator' />
      <View className='session-card__content'>
        <View className='session-card__header'>
          <Text className='session-card__title'>{session.title || session.external_id}</Text>
          <View className={`session-card__badge ${isActive ? 'session-card__badge--active' : ''}`}>
            <View className='session-card__dot' />
            <Text>{label}</Text>
          </View>
        </View>
        <View className='session-card__meta'>
          <View className='session-card__tag'>
            <Text>{session.source}</Text>
          </View>
          <Text className='session-card__tokens'>{formatTokens(tokens)} tokens</Text>
        </View>
      </View>
    </View>
  )
}
