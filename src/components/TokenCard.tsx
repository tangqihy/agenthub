import { View, Text } from '@tarojs/components'
import { formatTokens } from '../services/types'
import './TokenCard.scss'

interface Props {
  label: string
  tokens: number
  cost?: number
}

export default function TokenCard({ label, tokens, cost }: Props) {
  return (
    <View className='token-card'>
      <Text className='token-card__label'>{label}</Text>
      <Text className='token-card__value'>{formatTokens(tokens)}</Text>
      {cost !== undefined && (
        <Text className='token-card__cost'>${cost.toFixed(2)}</Text>
      )}
    </View>
  )
}
