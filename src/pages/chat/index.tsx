/**
 * ChatPage - Agent对话页面
 * Integrated with harnss-style components + WebSocket streaming
 *
 * Features:
 *  - Fixed header / scrollable messages / fixed input (full-height flex layout)
 *  - ChatEmptyState with suggestion cards when no messages
 *  - Consecutive tool_call messages grouped into ToolActivityGroup
 *  - ReasoningRow for thinking/reasoning content
 *  - TypingIndicator when streaming but no content yet
 *  - Avatar grouping: only show avatar on role change
 *  - Token usage display from stream events
 *  - Approve / Deny callbacks (toast stubs)
 */
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { api } from '../../services/api'
import type { Agent } from '../../services/types'
import type { UIMessage, ConversationSummary } from '../../types/chat'
import {
  createUserMessage,
  createAssistantMessage,
  createToolCallMessage,
  createErrorMessage,
} from '../../types/chat'
import { MessageBubble } from '../../components/chat/MessageBubble'
import { ChatInput } from '../../components/chat/ChatInput'
import { ChatEmptyState } from '../../components/chat/ChatEmptyState'
import { TypingIndicator } from '../../components/chat/TypingIndicator'
import { ToolActivityGroup } from '../../components/chat/ToolActivityGroup'
import { ReasoningRow } from '../../components/chat/ReasoningRow'
import '../../app.scss'
import './index.scss'

// ── Renderable group: either a message, a tool-group, or a reasoning row ──

interface MessageRenderItem {
  kind: 'message'
  message: UIMessage
  showAvatar: boolean
}

interface ToolGroupRenderItem {
  kind: 'tool_group'
  messages: UIMessage[]
  showAvatar: boolean
}

interface ReasoningRenderItem {
  kind: 'reasoning'
  text: string
  active: boolean
  showAvatar: boolean
}

type RenderItem = MessageRenderItem | ToolGroupRenderItem | ReasoningRenderItem

/**
 * Group consecutive tool_call messages into a single ToolGroupRenderItem.
 * Also extract standalone thinking/reasoning into ReasoningRenderItem.
 */
function buildRenderList(messages: UIMessage[]): RenderItem[] {
  const items: RenderItem[] = []
  let i = 0

  while (i < messages.length) {
    const msg = messages[i]

    // Determine avatar visibility (show on role change or first message)
    const prevRole = i > 0 ? messages[i - 1].role : undefined
    const showAvatar = i === 0 || msg.role !== prevRole

    // Group consecutive tool_call messages
    if (msg.role === 'tool_call') {
      const group: UIMessage[] = [msg]
      let j = i + 1
      while (j < messages.length && messages[j].role === 'tool_call') {
        group.push(messages[j])
        j++
      }
      items.push({ kind: 'tool_group', messages: group, showAvatar })
      i = j
      continue
    }

    // Standalone reasoning/thinking (assistant with only thinking, no content)
    if (msg.role === 'assistant' && msg.thinking && !msg.content) {
      items.push({
        kind: 'reasoning',
        text: msg.thinking,
        active: !!msg.isStreaming && !msg.thinkingComplete,
        showAvatar,
      })
      i++
      continue
    }

    items.push({ kind: 'message', message: msg, showAvatar })
    i++
  }

  return items
}

// ── Main Component ──

export default function ChatPage() {
  const router = useRouter()
  const agentId = router.params.agentId || ''
  const conversationId = router.params.conversationId || ''

  const [agent, setAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [convId, setConvId] = useState(conversationId)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingThinking, setStreamingThinking] = useState('')
  const [tokenUsage, setTokenUsage] = useState<{ input: number; output: number } | null>(null)
  const scrollRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamingMsgRef = useRef<string>('')
  const streamingThinkRef = useRef<string>('')

  // ── Load conversations list ──
  const loadConversations = useCallback(async () => {
    if (!agentId) return
    try {
      const items = await api.agentConversations(agentId)
      setConversations(items)
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
  }, [agentId])

  // ── Load conversation history ──
  const loadConversation = useCallback(async (id: string) => {
    if (!agentId || !id) return
    setHistoryLoading(true)
    try {
      const data = await api.agentConversation(agentId, id)
      const history: UIMessage[] = data.messages.map((m, i) => ({
        id: `hist_${i}`,
        role: m.role as UIMessage['role'],
        content: m.content,
        timestamp: Date.now() - (data.messages.length - i) * 1000,
        toolName: m.tool_calls?.[0]?.function?.name,
        toolInput: m.tool_calls?.[0]?.function?.arguments
          ? JSON.parse(m.tool_calls[0].function.arguments)
          : undefined,
      }))
      setMessages(history)
      setConvId(data.conversation_id)
    } catch {
      Taro.showToast({ title: '加载历史失败', icon: 'error' })
    } finally {
      setHistoryLoading(false)
    }
  }, [agentId])

  // ── Connect to WebSocket ──
  const connectWS = useCallback(() => {
    if (!agentId) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}/api/v2/agents/${agentId}/chat/stream`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[Chat] WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWSMessage(data)
        } catch (err) {
          console.error('[Chat] Failed to parse message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('[Chat] WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('[Chat] WebSocket disconnected')
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectWS()
          }
        }, 3000)
      }
    } catch (err) {
      console.error('[Chat] Failed to connect WebSocket:', err)
    }
  }, [agentId])

  // ── Handle WebSocket message ──
  const handleWSMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'user_message':
        // User message confirmed
        break

      case 'stream_start':
        setIsStreaming(true)
        streamingMsgRef.current = ''
        streamingThinkRef.current = ''
        setStreamingThinking('')
        break

      case 'content':
        streamingMsgRef.current += data.content
        setStreamingContent(streamingMsgRef.current)
        break

      case 'thinking':
        // Extended: capture thinking/reasoning content
        streamingThinkRef.current += data.content || data.thinking || ''
        setStreamingThinking(streamingThinkRef.current)
        break

      case 'tool_calls':
        if (data.tool_calls) {
          data.tool_calls.forEach((tc: any) => {
            const toolMsg = createToolCallMessage(
              tc.function?.name || 'unknown',
              tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
              undefined,
              false
            )
            setMessages(prev => [...prev, toolMsg])
          })
        }
        break

      case 'token_usage':
        // Track token usage from stream events
        if (data.usage) {
          setTokenUsage({
            input: data.usage.input_tokens || data.usage.prompt_tokens || 0,
            output: data.usage.output_tokens || data.usage.completion_tokens || 0,
          })
        }
        break

      case 'stream_end':
        setIsStreaming(false)
        if (streamingMsgRef.current) {
          const assistantMsg = createAssistantMessage(streamingMsgRef.current)
          // Attach thinking if available
          if (streamingThinkRef.current) {
            assistantMsg.thinking = streamingThinkRef.current
            assistantMsg.thinkingComplete = true
          }
          setMessages(prev => [...prev, assistantMsg])
          streamingMsgRef.current = ''
          streamingThinkRef.current = ''
          setStreamingContent('')
          setStreamingThinking('')
        }
        setLoading(false)
        loadConversations().catch(() => {})
        break

      case 'error':
        setIsStreaming(false)
        setMessages(prev => [...prev, createErrorMessage(data.error || '请求失败')])
        setLoading(false)
        break

      case 'pong':
        // Keep alive response
        break
    }
  }, [loadConversations])

  // ── Load agent info ──
  useEffect(() => {
    if (!agentId) return
    api.agent(agentId).then(setAgent).catch(() => {})
    loadConversations().catch(() => {})
  }, [agentId, loadConversations])

  // ── Load conversation history if conversationId exists ──
  useEffect(() => {
    if (!agentId || !conversationId) return
    loadConversation(conversationId)
  }, [agentId, conversationId, loadConversation])

  // ── Connect WebSocket ──
  useEffect(() => {
    connectWS()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connectWS])

  // ── Scroll to bottom when messages change ──
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTo({
          scrollTop: 999999,
          animated: true,
        })
      }, 100)
    }
  }, [messages, streamingContent, streamingThinking])

  // ── Handle send message ──
  const handleSend = useCallback((content: string) => {
    if (!agentId || !content.trim() || loading) return

    const userMsg = createUserMessage(content)
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        message: content,
        conversation_id: convId || undefined,
      }))
    } else {
      // Fallback to HTTP API
      api.agentChat(agentId, content, convId || undefined)
        .then(response => {
          const assistantMsg = createAssistantMessage(response.reply)
          setMessages(prev => [...prev, assistantMsg])
          if (response.conversation_id && !convId) {
            setConvId(response.conversation_id)
          }
          loadConversations().catch(() => {})
        })
        .catch(err => {
          setMessages(prev => [...prev, createErrorMessage(err.message || '请求失败')])
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [agentId, convId, loading, loadConversations])

  // ── Handle retry ──
  const handleRetry = useCallback((messageId: string) => {
    const msg = messages.find(m => m.id === messageId)
    if (msg && msg.role === 'user') {
      handleSend(msg.content)
    }
  }, [messages, handleSend])

  // ── Handle new conversation ──
  const handleNewConversation = useCallback(() => {
    setMessages([])
    setConvId('')
    setStreamingContent('')
    setStreamingThinking('')
    setTokenUsage(null)
  }, [])

  // ── Handle approve / deny (stub – show toast for now) ──
  const handleApprove = useCallback(() => {
    Taro.showToast({ title: '已批准', icon: 'success' })
  }, [])

  const handleDeny = useCallback(() => {
    Taro.showToast({ title: '已拒绝', icon: 'none' })
  }, [])

  // ── Handle suggestion selection from empty state ──
  const handleSelectSuggestion = useCallback((text: string) => {
    handleSend(text)
  }, [handleSend])

  // ── Build render list ──
  const renderItems = useMemo(() => buildRenderList(messages), [messages])

  // ── Token usage display ──
  const tokenDisplay = useMemo(() => {
    if (!tokenUsage) return null
    const total = tokenUsage.input + tokenUsage.output
    if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M tokens`
    if (total >= 1_000) return `${(total / 1_000).toFixed(1)}K tokens`
    return `${total} tokens`
  }, [tokenUsage])

  return (
    <View className='chat-page'>
      {/* ── Fixed Header ── */}
      <View className='chat-header'>
        <View className='header-left' onClick={() => Taro.navigateBack()}>
          <Text className='back-icon'>←</Text>
        </View>

        <View className='header-center'>
          <View className='header-title-row'>
            <Text className='agent-name'>{agent?.name || 'Agent'}</Text>
            {isStreaming && (
              <View className='status-badge status-badge--streaming'>
                <View className='status-dot' />
                <Text className='status-text'>思考中</Text>
              </View>
            )}
            {!isStreaming && agent && (
              <View className='status-badge status-badge--ready'>
                <View className='status-dot' />
                <Text className='status-text'>在线</Text>
              </View>
            )}
          </View>
          {tokenDisplay && (
            <Text className='token-usage'>{tokenDisplay}</Text>
          )}
        </View>

        <View className='header-right' onClick={handleNewConversation}>
          <Text className='new-chat-icon'>+</Text>
        </View>
      </View>

      {/* ── Scrollable Messages Area ── */}
      <ScrollView
        ref={scrollRef}
        className='chat-messages'
        scrollY
        scrollWithAnimation
        enhanced
        showScrollbar={false}
      >
        {/* History loading */}
        {historyLoading && (
          <View className='chat-loading'>
            <Text className='loading-text'>加载历史消息...</Text>
          </View>
        )}

        {/* Empty state */}
        {messages.length === 0 && !historyLoading && (
          <ChatEmptyState
            agentName={agent?.name}
            onSelectSuggestion={handleSelectSuggestion}
          />
        )}

        {/* Render grouped message list */}
        {renderItems.map((item, idx) => {
          if (item.kind === 'tool_group') {
            return (
              <ToolActivityGroup
                key={`tg_${item.messages[0].id}_${idx}`}
                items={item.messages}
                showAvatar={item.showAvatar}
              />
            )
          }

          if (item.kind === 'reasoning') {
            return (
              <ReasoningRow
                key={`rr_${idx}`}
                text={item.text}
                active={item.active}
                showAvatar={item.showAvatar}
              />
            )
          }

          // kind === 'message'
          return (
            <MessageBubble
              key={item.message.id}
              message={item.message}
              showAvatar={item.showAvatar}
              onRetry={handleRetry}
              onApprove={handleApprove}
              onDeny={handleDeny}
            />
          )
        })}

        {/* Streaming content – render as a live assistant message */}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              thinking: streamingThinking || undefined,
              thinkingComplete: false,
              timestamp: Date.now(),
              isStreaming: true,
            }}
            showAvatar={
              messages.length === 0 ||
              messages[messages.length - 1]?.role !== 'assistant'
            }
            onApprove={handleApprove}
            onDeny={handleDeny}
          />
        )}

        {/* Streaming thinking only (no content yet) */}
        {isStreaming && !streamingContent && streamingThinking && (
          <ReasoningRow
            text={streamingThinking}
            active
            showAvatar={
              messages.length === 0 ||
              messages[messages.length - 1]?.role !== 'assistant'
            }
          />
        )}

        {/* Typing indicator when streaming but nothing visible yet */}
        {isStreaming && !streamingContent && !streamingThinking && (
          <TypingIndicator />
        )}
      </ScrollView>

      {/* ── Fixed Chat Input ── */}
      <ChatInput
        onSend={handleSend}
        onStop={isStreaming ? () => {
          // Attempt to stop via WebSocket
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop' }))
          }
          setIsStreaming(false)
          setLoading(false)
          if (streamingMsgRef.current) {
            const assistantMsg = createAssistantMessage(streamingMsgRef.current)
            setMessages(prev => [...prev, assistantMsg])
            streamingMsgRef.current = ''
            setStreamingContent('')
          }
        } : undefined}
        disabled={loading}
        loading={loading}
        placeholder={`向 ${agent?.name || 'Agent'} 提问...`}
      />
    </View>
  )
}
