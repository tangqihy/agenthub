import { View, Text } from '@tarojs/components'
import type { AgentVersion } from '../services/types'
import './VersionList.scss'

interface Props {
  versions: AgentVersion[]
  currentVersion: number
  onRollback?: (v: number) => void
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

export default function VersionList({ versions, currentVersion, onRollback }: Props) {
  if (!versions || versions.length === 0) {
    return (
      <View className='version-list'>
        <View className='version-list__empty'>
          <Text className='version-list__empty-text'>暂无版本历史</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='version-list'>
      {versions.map((v) => {
        const isCurrent = v.version === currentVersion
        const cfg = v.config_json || {}
        const skillsCount = cfg.skills?.length || 0
        const mcpCount = cfg.mcp?.length || 0

        return (
          <View
            key={v.id}
            className={`version-item ${isCurrent ? 'version-item--current' : ''}`}
          >
            <View className='version-item__header'>
              <View className='version-item__badge'>
                <Text className='version-item__ver'>v{v.version}</Text>
                {isCurrent && <Text className='version-item__current-tag'>当前</Text>}
              </View>
              <Text className='version-item__time'>{formatTime(v.created_at)}</Text>
            </View>
            <View className='version-item__config'>
              {cfg.model && (
                <View className='version-item__config-row'>
                  <Text className='version-item__config-label'>模型</Text>
                  <Text className='version-item__config-value'>{cfg.model}</Text>
                </View>
              )}
              {cfg.prompt && (
                <View className='version-item__config-row'>
                  <Text className='version-item__config-label'>Prompt</Text>
                  <Text className='version-item__config-value'>
                    {cfg.prompt.length > 60 ? cfg.prompt.slice(0, 60) + '...' : cfg.prompt}
                  </Text>
                </View>
              )}
              {(skillsCount > 0 || mcpCount > 0) && (
                <View className='version-item__config-row'>
                  <Text className='version-item__config-label'>能力</Text>
                  <Text className='version-item__config-value'>
                    {skillsCount > 0 ? `${skillsCount} skills` : ''}
                    {skillsCount > 0 && mcpCount > 0 ? ' · ' : ''}
                    {mcpCount > 0 ? `${mcpCount} mcp` : ''}
                  </Text>
                </View>
              )}
            </View>
            {!isCurrent && onRollback && (
              <View className='version-item__action'>
                <View
                  className='version-item__rollback-btn'
                  onClick={(e) => {
                    e.stopPropagation()
                    onRollback(v.version)
                  }}
                >
                  <Text className='version-item__rollback-text'>回滚</Text>
                </View>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}
