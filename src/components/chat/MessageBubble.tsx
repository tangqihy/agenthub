/**
 * MessageBubble - Agent对话消息气泡
 * Refactored to use MarkdownRenderer, ToolActivityGroup, ReasoningRow
 */
import { View, Text, Image } from '@tarojs/components'
import { useState, useMemo, useCallback, memo } from 'react'
import Taro from '@tarojs/taro'
import type { UIMessage } from '../../types/chat'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ToolActivityGroup } from './ToolActivityGroup'
import { ReasoningRow } from './ReasoningRow'
import './MessageBubble.scss'

// ── Dangerous command patterns for approval detection ──

const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i,
  /\bsudo\b/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,
  /TRUNCATE\s+TABLE/i,
  /mkfs\./i,
  />\s*\/dev\/sd/i,
  /\bdd\s+if=/i,
  /chmod\s+777/i,
  /curl\s.*\|\s*sh/i,
  /wget\s.*\|\s*sh/i,
  /:\(\)\{\s*:\|:&\s*\};:/, // fork bomb
]

function containsDangerousCommand(text: string): boolean {
  if (!text) return false
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(text))
}

// ── Props ──

interface MessageBubbleProps {
  message: UIMessage
  showThinking?: boolean
  showAvatar?: boolean
  onRetry?: (messageId: string) => void
  onApprove?: () => void
  onDeny?: () => void
}

// ── Component ──

function MessageBubbleInner({
  message,
  showThinking = true,
  showAvatar = true,
  onRetry,
  onApprove,
  onDeny,
}: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(true)

  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isSystem = message.role === 'system'
  const isToolResult = message.role === 'tool_result'
  const isToolCall = message.role === 'tool_call'

  // Format timestamp
  const timeStr = useMemo(() => {
    const date = new Date(message.timestamp)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }, [message.timestamp])

  // Copy content to clipboard
  const handleCopy = useCallback(() => {
    Taro.setClipboardData({
      data: message.content,
      success: () => {
        Taro.showToast({ title: '已复制', icon: 'success' })
      },
    })
  }, [message.content])

  // Check if content contains dangerous commands
  const isDangerous = useMemo(
    () => isAssistant && containsDangerousCommand(message.content),
    [isAssistant, message.content]
  )

  // ── Error state ──
  if (message.isError) {
    return (
      <View className='message-bubble message-error'>
        {showAvatar && (
          <View className='message-avatar message-avatar--assistant'>
            <Text className='message-avatar-icon'>⚠️</Text>
          </View>
        )}
        <View className='message-body'>
          <View className='message-header'>
            <Text className='message-role'>⚠️ 系统</Text>
            <Text className='message-time'>{timeStr}</Text>
          </View>
          <View className='message-content error-content'>
            <Text>{message.content}</Text>
          </View>
        </View>
      </View>
    )
  }

  // ── System messages ──
  if (isSystem) {
    return (
      <View className='message-bubble message-system'>
        <Text className='system-text'>{message.content}</Text>
      </View>
    )
  }

  // ── Tool call messages (rendered via ToolActivityGroup) ──
  if (isToolCall) {
    return (
      <ToolActivityGroup
        items={[message]}
        active={message.isStreaming}
        showAvatar={showAvatar}
      />
    )
  }

  // ── Tool result messages ──
  if (isToolResult) {
    return (
      <View className='message-bubble message-tool-result'>
        {showAvatar && (
          <View className='message-avatar message-avatar--tool'>
            <Text className='message-avatar-icon'>🔧</Text>
          </View>
        )}
        <View className='message-body'>
          <View className='message-header'>
            <Text className='message-role'>🔧 工具结果</Text>
            <Text className='message-time'>{timeStr}</Text>
          </View>
          <View className='message-content tool-result-content'>
            <Text userSelect>{message.content}</Text>
          </View>
        </View>
      </View>
    )
  }

  // ── User message ──
  if (isUser) {
    return (
      <View className='message-bubble message-user'>
        <View className='message-body'>
          <View className='message-header'>
            <Text className='message-time'>{timeStr}</Text>
          </View>
          <View className='message-content user-content'>
            <Text userSelect>{message.content}</Text>
          </View>
          {/* Image attachments */}
          {message.images && message.images.length > 0 && (
            <View className='message-images'>
              {message.images.map((img, i) => (
                <Image
                  key={i}
                  src={img.url}
                  mode='widthFix'
                  className='message-image'
                  onClick={() => {
                    Taro.previewImage({
                      urls: message.images!.map(i => i.url),
                      current: img.url,
                    })
                  }}
                />
              ))}
            </View>
          )}
        </View>
        {showAvatar && (
          <View className='message-avatar message-avatar--user'>
            <Text className='message-avatar-icon'>👤</Text>
          </View>
        )}
      </View>
    )
  }

  // ── Assistant message ──
  if (isAssistant) {
    return (
      <View className='message-bubble message-assistant'>
        {showAvatar && (
          <View className='message-avatar message-avatar--assistant'>
            <Text className='message-avatar-icon'>🤖</Text>
          </View>
        )}
        <View className='message-body'>
          <View className='message-header'>
            <Text className='message-role'>🤖 Assistant</Text>
            <Text className='message-time'>{timeStr}</Text>
          </View>

          {/* Thinking / reasoning block */}
          {showThinking && message.thinking && (
            <ReasoningRow
              text={message.thinking}
              active={!message.thinkingComplete && message.isStreaming}
              showAvatar={false}
            />
          )}

          {/* Main content */}
          <View className='message-content assistant-content'>
            {message.isStreaming && !message.content ? (
              <View className='streaming-indicator'>
                <View className='cursor-blink' />
              </View>
            ) : message.isStreaming ? (
              <View className='streaming-indicator'>
                <MarkdownRenderer>{message.content}</MarkdownRenderer>
                <View className='cursor-blink' />
              </View>
            ) : (
              <MarkdownRenderer>{message.content}</MarkdownRenderer>
            )}
          </View>

          {/* Approval buttons for dangerous commands */}
          {isDangerous && !message.isStreaming && (onApprove || onDeny) && (
            <View className='message-approval'>
              <Text className='approval-warning'>
                ⚠️ 此消息包含可能危险的操作
              </Text>
              <View className='approval-actions'>
                {onApprove && (
                  <View className='approval-btn approval-btn--approve' onClick={onApprove}>
                    <Text className='approval-btn-text'>✅ 批准</Text>
                  </View>
                )}
                {onDeny && (
                  <View className='approval-btn approval-btn--deny' onClick={onDeny}>
                    <Text className='approval-btn-text'>❌ 拒绝</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action bar */}
          {!message.isStreaming && (
            <View className='message-actions'>
              <View className='action-btn' onClick={handleCopy}>
                <Text className='action-text'>📋 复制</Text>
              </View>
              {onRetry && (
                <View className='action-btn' onClick={() => onRetry(message.id)}>
                  <Text className='action-text'>🔄 重试</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    )
  }

  return null
}

MessageBubbleInner.displayName = 'MessageBubble'

export const MessageBubble = memo(MessageBubbleInner)
export default MessageBubble
