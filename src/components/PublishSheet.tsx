import { View, Text } from '@tarojs/components'
import './PublishSheet.scss'

interface Props {
  visible: boolean
  currentScope: string
  onSelect: (scope: string) => void
  onClose: () => void
}

const SCOPES = [
  { key: 'private', icon: '🔒', label: '私有', desc: '仅自己可见', cls: 'publish-sheet__option--private' },
  { key: 'family', icon: '👨‍👩‍👧‍👦', label: '家庭', desc: '家庭成员可见', cls: 'publish-sheet__option--family' },
  { key: 'public', icon: '🌍', label: '公开', desc: '所有人可见', cls: 'publish-sheet__option--public' },
]

export default function PublishSheet({ visible, currentScope, onSelect, onClose }: Props) {
  if (!visible) return null

  return (
    <View className='publish-sheet' onClick={onClose}>
      <View className='publish-sheet__content' onClick={(e) => e.stopPropagation()}>
        <View className='publish-sheet__header'>
          <Text className='publish-sheet__title'>发布范围</Text>
          <View className='publish-sheet__close' onClick={onClose}>
            <Text className='publish-sheet__close-text'>✕</Text>
          </View>
        </View>
        <View className='publish-sheet__list'>
          {SCOPES.map((s) => {
            const isActive = currentScope === s.key
            return (
              <View
                key={s.key}
                className={`publish-sheet__option ${s.cls} ${isActive ? 'publish-sheet__option--active' : ''}`}
                onClick={() => onSelect(s.key)}
              >
                <Text className='publish-sheet__option-icon'>{s.icon}</Text>
                <View className='publish-sheet__option-info'>
                  <Text className='publish-sheet__option-label'>{s.label}</Text>
                  <Text className='publish-sheet__option-desc'>{s.desc}</Text>
                </View>
                {isActive && <Text className='publish-sheet__check'>✓</Text>}
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}
