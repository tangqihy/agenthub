import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../services/api'
import type { Agent } from '../../services/types'
import '../../app.scss'
import './index.scss'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface RuntimeStatus {
  configured: boolean
  provider: string
  model: string
}

interface ConversationSummary {
  conversation_id: string
  last_message_at: number
  message_count: number
  last_message?: string
}

export default function ChatPage() {
  const router = useRouter()
  const agentId = router.params.agentId || ''
  const conversationId = router.params.conversationId || ''

  const [agent, setAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [convId, setConvId] = useState(conversationId)
  const scrollRef = useRef<string>('')

  const loadConversations = useCallback(async () => {
    if (!agentId) return
    const items = await api.agentConversations(agentId)
    setConversations(items)
  }, [agentId])

  const loadConversation = useCallback(async (id: string) => {
    if (!agentId || !id) return
    setHistoryLoading(true)
    try {
      const data = await api.agentConversation(agentId, id)
      const history: Message[] = data.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      setMessages(history)
      setConvId(data.conversation_id)
    } catch {
      Taro.showToast({ title: '加载历史失败', icon: 'error' })
    } finally {
      setHistoryLoading(false)
    }
  }, [agentId])

  // Load agent info
  useEffect(() => {
    if (!agentId) return
    api.agent(agentId).then(setAgent).catch(() => {})
    loadConversations().catch(() => {})
  }, [agentId, loadConversations])

  useEffect(() => {
    api.chatRuntimeStatus().then(setRuntimeStatus).catch(() => {})
  }, [])

  // Load conversation history if conversationId exists
  useEffect(() => {
    if (!agentId || !conversationId) return
    loadConversation(conversationId)
  }, [agentId, conversationId, loadConversation])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current = `msg-${messages.length - 1}`
    }
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || loading || runtimeStatus?.configured === false) return

    // Add user message immediately
    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setLoading(true)

    try {
      const res = await api.agentChat(agentId, text, convId || undefined)
      setConvId(res.conversation_id)
      const assistantMsg: Message = { role: 'assistant', content: res.reply }
      setMessages((prev) => [...prev, assistantMsg])
      loadConversations().catch(() => {})
    } catch (e) {
      const message = e instanceof Error ? e.message : '发送失败'
      Taro.showToast({ title: message.slice(0, 20), icon: 'error' })
      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }, [inputValue, loading, agentId, convId, runtimeStatus, loadConversations])

  const handleNewConversation = useCallback(() => {
    setConvId('')
    setMessages([])
    setInputValue('')
  }, [])

  const handleKeyDown = useCallback(
    (e: { detail: { keyCode: number } }) => {
      if (e.detail.keyCode === 13) {
        handleSend()
      }
    },
    [handleSend],
  )

  if (!agentId) {
    return (
      <View className='chat-page'>
        <View className='chat-page__error'>
          <Text className='chat-page__error-text'>缺少 Agent ID</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='chat-page'>
      {/* Agent Header */}
      <View className='chat-page__header'>
        <View className='chat-page__header-avatar'>
          <Text className='chat-page__header-avatar-text'>{agent?.avatar || '🤖'}</Text>
        </View>
        <View className='chat-page__header-info'>
          <Text className='chat-page__header-name'>{agent?.name || '加载中...'}</Text>
          <Text className='chat-page__header-desc'>{agent?.description || ''}</Text>
        </View>
      </View>

      {runtimeStatus && !runtimeStatus.configured && (
        <View className='chat-page__runtime-warning'>
          <Text className='chat-page__runtime-warning-text'>
            Chat Runtime 未配置，请设置 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
          </Text>
        </View>
      )}

      <View className='chat-page__conversation-bar'>
        <ScrollView className='chat-page__conversation-scroll' scrollX>
          <View
            className={`chat-page__conversation-chip ${!convId ? 'chat-page__conversation-chip--active' : ''}`}
            onClick={handleNewConversation}
          >
            <Text className='chat-page__conversation-chip-text'>新对话</Text>
          </View>
          {conversations.map((item) => (
            <View
              key={item.conversation_id}
              className={`chat-page__conversation-chip ${convId === item.conversation_id ? 'chat-page__conversation-chip--active' : ''}`}
              onClick={() => loadConversation(item.conversation_id)}
            >
              <Text className='chat-page__conversation-chip-text'>
                {(item.last_message || item.conversation_id).slice(0, 18)}
              </Text>
              <Text className='chat-page__conversation-chip-meta'>{item.message_count} 条</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Message List */}
      <ScrollView
        className='chat-page__messages'
        scrollY
        scrollIntoView={scrollRef.current}
        scrollWithAnimation
      >
        {historyLoading && (
          <View className='chat-page__loading'>
            <Text className='chat-page__loading-text'>加载历史消息中...</Text>
          </View>
        )}

        {!historyLoading && messages.length === 0 && (
          <View className='chat-page__empty'>
            <Text className='chat-page__empty-icon'>💬</Text>
            <Text className='chat-page__empty-text'>
              和 {agent?.name || 'Agent'} 开始对话吧
            </Text>
          </View>
        )}

        {messages.map((msg, idx) => (
          <View
            key={idx}
            id={`msg-${idx}`}
            className={`chat-page__bubble-wrap chat-page__bubble-wrap--${msg.role}`}
          >
            {msg.role === 'assistant' && (
              <View className='chat-page__bubble-avatar'>
                <Text className='chat-page__bubble-avatar-text'>{agent?.avatar || '🤖'}</Text>
              </View>
            )}
            <View className={`chat-page__bubble chat-page__bubble--${msg.role}`}>
              <Text className={`chat-page__bubble-text chat-page__bubble-text--${msg.role}`}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View className='chat-page__bubble-wrap chat-page__bubble-wrap--assistant'>
            <View className='chat-page__bubble-avatar'>
              <Text className='chat-page__bubble-avatar-text'>{agent?.avatar || '🤖'}</Text>
            </View>
            <View className='chat-page__bubble chat-page__bubble--assistant chat-page__bubble--thinking'>
              <Text className='chat-page__bubble-text chat-page__bubble-text--thinking'>
                思考中...
              </Text>
            </View>
          </View>
        )}

        <View id='chat-bottom' style={{ height: 1 }} />
      </ScrollView>

      {/* Input Bar */}
      <View className='chat-page__input-bar'>
        <Input
          className='chat-page__input'
          value={inputValue}
          onInput={(e) => setInputValue(e.detail.value)}
          onConfirm={handleSend}
          placeholder='输入消息...'
          placeholderClass='chat-page__input-placeholder'
          confirmType='send'
          disabled={loading || runtimeStatus?.configured === false}
        />
        <View
          className={`chat-page__send-btn ${!inputValue.trim() || loading || runtimeStatus?.configured === false ? 'chat-page__send-btn--disabled' : ''}`}
          onClick={handleSend}
        >
          <Text className='chat-page__send-btn-text'>↑</Text>
        </View>
      </View>
    </View>
  )
}
