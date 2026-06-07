import { View } from '@tarojs/components'
import './SkeletonLoader.scss'

interface Props {
  rows?: number
  type?: 'card' | 'list' | 'text' | 'avatar'
}

export default function SkeletonLoader({ rows = 3, type = 'card' }: Props) {
  return (
    <View className={`skeleton-loader skeleton-loader--${type}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          className='skeleton-loader__item'
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </View>
  )
}
