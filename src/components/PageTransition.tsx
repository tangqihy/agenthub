import { View } from '@tarojs/components'
import type { ReactNode } from 'react'
import './PageTransition.scss'

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <View className='page-transition'>
      {children}
    </View>
  )
}
