import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Tag } from '@nutui/nutui-react-taro'
import { usePolling } from '../../hooks/usePolling'
import { api } from '../../services/api'
import { sessionLabel, formatTokens } from '../../services/types'
import EventTimeline from '../../components/EventTimeline'
import '../../app.scss'

export default function SessionDetailPage() {
  const router = useRouter()
  const id = router.params.id || ''

  const { data: session } = usePolling(() => api.session(id), 5000, !!id)
  const { data: events } = usePolling(() => api.events(id), 5000, !!id)

  if (!id) return <View className='page'>缺少 Session ID</View>
  if (!session) return <View className='page'>加载中...</View>

  return (
    <View className='page'>
      <View className='section'>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: 600 }}>{session.title}</Text>
          <Tag type={session.is_active ? 'success' : 'default'}>{sessionLabel(session)}</Tag>
        </View>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 8, display: 'block' }}>
          {session.source} · {session.model || 'unknown model'}
        </Text>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 4, display: 'block' }}>
          {formatTokens(session.input_tokens + session.output_tokens)} tokens · {session.tool_calls} tools
        </Text>
      </View>

      {/* Create Agent from Session */}
      <View className='section'>
        <View
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0',
          }}
          onClick={async () => {
            try {
              const agent = await api.agentFromSession(id)
              Taro.navigateTo({ url: `/pages/agents/editor?id=${agent.id}` })
            } catch {
              Taro.showToast({ title: '创建失败', icon: 'error' })
            }
          }}
        >
          <Text style={{ fontSize: 28, lineHeight: 1 }}>🤖</Text>
          <View>
            <Text style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
              创建 Agent
            </Text>
            <Text style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
              从当前会话沉淀为可复用的 Agent
            </Text>
          </View>
        </View>
      </View>

      <View className='section'>
        <Text className='section__title'>Timeline</Text>
        <EventTimeline events={events || []} />
      </View>
    </View>
  )
}
