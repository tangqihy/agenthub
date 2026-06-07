import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { api } from '../../services/api'
import type { Agent, AgentVersion, AgentRun } from '../../services/types'
import VersionList from '../../components/VersionList'
import PublishSheet from '../../components/PublishSheet'
import BottomNav from '../../components/BottomNav'
import '../../app.scss'
import './detail.scss'

const SCOPE_CONFIG: Record<string, { label: string; cls: string }> = {
  private: { label: '私有', cls: 'agent-detail__scope--private' },
  family: { label: '家庭', cls: 'agent-detail__scope--family' },
  public: { label: '公开', cls: 'agent-detail__scope--public' },
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  running: { label: '运行中', cls: 'agent-run__status--running' },
  completed: { label: '已完成', cls: 'agent-run__status--completed' },
  failed: { label: '失败', cls: 'agent-run__status--failed' },
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

export default function AgentDetailPage() {
  const router = useRouter()
  const agentId = router.params.id || ''

  const [publishVisible, setPublishVisible] = useState(false)

  const { data: agent, refresh: refreshAgent } = usePolling<Agent>(
    () => api.agent(agentId),
    5000,
    !!agentId,
  )
  const { data: versions, refresh: refreshVersions } = usePolling<AgentVersion[]>(
    () => api.agentVersions(agentId),
    10000,
    !!agentId,
  )
  const { data: runs } = usePolling<AgentRun[]>(
    () => api.agentRuns(agentId, 10),
    10000,
    !!agentId,
  )
  const { data: tree } = usePolling<{ agent: Agent; parent: Agent | null; children: Agent[] }>(
    () => api.agentTree(agentId),
    30000,
    !!agentId,
  )

  if (!agentId) return <View className='page'>缺少 Agent ID</View>
  if (!agent) return <View className='page'>加载中...</View>

  const scope = SCOPE_CONFIG[agent.publish_scope] || SCOPE_CONFIG.private

  const handleClone = async () => {
    try {
      await api.agentClone(agentId)
      Taro.showToast({ title: '克隆成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 800)
    } catch {
      Taro.showToast({ title: '克隆失败', icon: 'error' })
    }
  }

  const handlePublish = async (newScope: string) => {
    try {
      await api.agentUpdate(agentId, { publish_scope: newScope })
      setPublishVisible(false)
      refreshAgent()
      Taro.showToast({ title: '发布范围已更新', icon: 'success' })
    } catch {
      Taro.showToast({ title: '更新失败', icon: 'error' })
    }
  }

  const handleRollback = async (v: number) => {
    try {
      await api.agentVersionRollback(agentId, v)
      refreshAgent()
      refreshVersions()
      Taro.showToast({ title: `已回滚到 v${v}`, icon: 'success' })
    } catch {
      Taro.showToast({ title: '回滚失败', icon: 'error' })
    }
  }

  const hasNotes = agent.notes || agent.use_cases || agent.caveats

  return (
    <View className='page'>
      {/* Header */}
      <View className='agent-detail__header'>
        <View className='agent-detail__avatar'>
          <Text className='agent-detail__avatar-text'>{agent.avatar || '🤖'}</Text>
        </View>
        <View className='agent-detail__info'>
          <View className='agent-detail__name-row'>
            <Text className='agent-detail__name'>{agent.name}</Text>
            <View className={`agent-detail__scope ${scope.cls}`}>
              <Text>{scope.label}</Text>
            </View>
          </View>
          <Text className='agent-detail__desc'>{agent.description || '暂无描述'}</Text>
          <View className='agent-detail__meta'>
            <View className='agent-detail__tag'>
              <Text>{agent.runtime}</Text>
            </View>
            <Text className='agent-detail__version'>v{agent.current_version}</Text>
          </View>
        </View>
      </View>

      {/* Usage Stats */}
      <View className='section'>
        <Text className='section__title'>使用统计</Text>
        <View style={{ display: 'flex', gap: 24 }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', display: 'block' }}>
              {agent.usage_count}
            </Text>
            <Text style={{ fontSize: 11, color: 'var(--text-muted)' }}>运行次数</Text>
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block' }}>
              {agent.last_used_at ? formatTime(agent.last_used_at) : '从未使用'}
            </Text>
            <Text style={{ fontSize: 11, color: 'var(--text-muted)' }}>最近使用</Text>
          </View>
        </View>
      </View>

      {/* Notes Section */}
      {hasNotes && (
        <View className='section'>
          <Text className='section__title'>使用指南</Text>
          {agent.notes && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                使用说明
              </Text>
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {agent.notes}
              </Text>
            </View>
          )}
          {agent.use_cases && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                适用场景
              </Text>
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {agent.use_cases}
              </Text>
            </View>
          )}
          {agent.caveats && (
            <View>
              <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                注意事项
              </Text>
              <Text style={{ fontSize: 12, color: 'var(--color-warning)', lineHeight: 1.6 }}>
                {agent.caveats}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Source Session Link */}
      {agent.source_session_id && (
        <View className='section'>
          <View
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}
            onClick={() => Taro.navigateTo({ url: `/pages/sessions/detail?id=${agent.source_session_id}` })}
          >
            <Text style={{ fontSize: 16 }}>💬</Text>
            <View>
              <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                查看来源会话
              </Text>
              <Text style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                此 Agent 由会话沉淀而来
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Evolution Tree */}
      {tree && (tree.parent || (tree.children && tree.children.length > 0)) && (
        <View className='section'>
          <Text className='section__title'>演化关系</Text>
          {tree.parent && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                来源 Agent
              </Text>
              <View
                className='agent-detail__tree-card'
                onClick={() => Taro.navigateTo({ url: `/pages/agents/detail?id=${tree.parent!.id}` })}
              >
                <View className='agent-detail__tree-card-avatar'>
                  <Text style={{ fontSize: 18 }}>{tree.parent.avatar || '🤖'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                    {tree.parent.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    v{tree.parent.current_version} · {tree.parent.runtime}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</Text>
              </View>
            </View>
          )}
          {tree.children && tree.children.length > 0 && (
            <View>
              <Text style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                衍生 Agent ({tree.children.length})
              </Text>
              {tree.children.map((child) => (
                <View
                  key={child.id}
                  className='agent-detail__tree-card'
                  onClick={() => Taro.navigateTo({ url: `/pages/agents/detail?id=${child.id}` })}
                >
                  <View className='agent-detail__tree-card-avatar'>
                    <Text style={{ fontSize: 18 }}>{child.avatar || '🤖'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                      {child.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      v{child.current_version} · {child.runtime}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Action Bar */}
      <View className='agent-detail__actions'>
        <View
          className='agent-detail__action-btn agent-detail__action-btn--chat'
          onClick={() => Taro.navigateTo({ url: `/pages/chat/index?agentId=${agentId}` })}
        >
          <Text className='agent-detail__action-icon'>💬</Text>
          <Text className='agent-detail__action-label'>开始对话</Text>
        </View>
        <View
          className='agent-detail__action-btn agent-detail__action-btn--primary'
          onClick={() => Taro.navigateTo({ url: `/pages/agents/editor?id=${agentId}` })}
        >
          <Text className='agent-detail__action-icon'>✏️</Text>
          <Text className='agent-detail__action-label'>编辑</Text>
        </View>
        <View className='agent-detail__action-btn' onClick={handleClone}>
          <Text className='agent-detail__action-icon'>📋</Text>
          <Text className='agent-detail__action-label'>克隆</Text>
        </View>
        <View className='agent-detail__action-btn' onClick={() => setPublishVisible(true)}>
          <Text className='agent-detail__action-icon'>🚀</Text>
          <Text className='agent-detail__action-label'>发布</Text>
        </View>
      </View>

      {/* Current Version */}
      {versions && versions.length > 0 && (
        <View className='section'>
          <Text className='section__title'>当前版本</Text>
          <View className='agent-detail__current-version'>
            <Text className='agent-detail__cv-ver'>v{agent.current_version}</Text>
            {(() => {
              const cv = versions.find((v) => v.version === agent.current_version)
              if (!cv) return null
              const cfg = cv.config_json || {}
              return (
                <View className='agent-detail__cv-info'>
                  {cfg.model && (
                    <View className='agent-detail__cv-row'>
                      <Text className='agent-detail__cv-label'>模型</Text>
                      <Text className='agent-detail__cv-value'>{cfg.model}</Text>
                    </View>
                  )}
                  {cfg.prompt && (
                    <View className='agent-detail__cv-row'>
                      <Text className='agent-detail__cv-label'>Prompt</Text>
                      <Text className='agent-detail__cv-value'>
                        {cfg.prompt.length > 80 ? cfg.prompt.slice(0, 80) + '...' : cfg.prompt}
                      </Text>
                    </View>
                  )}
                </View>
              )
            })()}
          </View>
        </View>
      )}

      {/* Version History */}
      <View className='section'>
        <Text className='section__title'>版本历史</Text>
        <VersionList
          versions={versions || []}
          currentVersion={agent.current_version}
          onRollback={handleRollback}
        />
      </View>

      {/* Recent Runs */}
      <View className='section'>
        <Text className='section__title'>最近运行</Text>
        {(!runs || runs.length === 0) && (
          <View className='agent-detail__empty'>
            <Text className='agent-detail__empty-text'>暂无运行记录</Text>
          </View>
        )}
        {runs?.map((run) => {
          const status = STATUS_CONFIG[run.status] || STATUS_CONFIG.completed
          return (
            <View key={run.id} className='agent-run'>
              <View className='agent-run__header'>
                <View className={`agent-run__status ${status.cls}`}>
                  <View className='agent-run__dot' />
                  <Text className='agent-run__status-text'>{status.label}</Text>
                </View>
                <Text className='agent-run__runtime'>{run.runtime}</Text>
              </View>
              <View className='agent-run__meta'>
                <Text className='agent-run__time'>{formatTime(run.started_at)}</Text>
                {run.ended_at && (
                  <Text className='agent-run__duration'>
                    耗时 {Math.round(run.ended_at - run.started_at)}s
                  </Text>
                )}
              </View>
            </View>
          )
        })}
      </View>

      {/* Publish Sheet */}
      <PublishSheet
        visible={publishVisible}
        currentScope={agent.publish_scope}
        onSelect={handlePublish}
        onClose={() => setPublishVisible(false)}
      />

      <BottomNav active='/pages/agents/index' />
    </View>
  )
}
