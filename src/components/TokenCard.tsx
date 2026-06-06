import { View, Text } from '@tarojs/components'
import { formatTokens } from '../services/types'
import './TokenCard.scss'

interface Props {
  label: string
  tokens: number
  cost?: number
  variant?: 'primary' | 'success' | 'warning'
}

export default function TokenCard({ label, tokens, cost, variant = 'primary' }: Props) {
  return (
    <View className={`token-card token-card--${variant}`}>
      <View className='token-card__glow' />
      <Text className='token-card__label'>{label}</Text>
      <Text className='token-card__value'>{formatTokens(tokens)}</Text>
      {cost !== undefined && cost > 0 && (
        <Text className='token-card__cost'>${cost.toFixed(2)}</Text>
      )}
    </View>
  )
}
