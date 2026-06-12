/**
 * ChatInput - Agent对话输入框
 * Enhanced with auto-resize, IME support, loading/stop states
 */
import { View, Text, Textarea } from '@tarojs/components'
import { useState, useCallback, useRef, useEffect } from 'react'
import './ChatInput.scss'

interface ChatInputProps {
  onSend: (content: string) => void
  onStop?: () => void
  disabled?: boolean
  loading?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  onStop,
  disabled = false,
  loading = false,
  placeholder = '输入消息...'
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<any>(null)
  const composingRef = useRef(false)

  // Send message
  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled || loading) return
    onSend(trimmed)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      try {
        const el = textareaRef.current._input || textareaRef.current
        if (el && el.style) {
          el.style.height = 'auto'
        }
      } catch (_) {}
    }
  }, [value, disabled, loading, onSend])

  // IME composition event handlers
  const handleCompositionStart = useCallback(() => {
    composingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback(() => {
    composingRef.current = false
  }, [])

  // Auto-resize textarea based on content
  const autoResize = useCallback(() => {
    if (!textareaRef.current) return
    try {
      const el = textareaRef.current._input || textareaRef.current
      if (el && el.style) {
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  // Attach native DOM events for Enter/Shift+Enter and IME on H5
  useEffect(() => {
    if (!textareaRef.current) return
    try {
      const el = textareaRef.current._input || textareaRef.current
      if (!el || !el.addEventListener) return

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
          e.preventDefault()
          handleSend()
        }
      }

      el.addEventListener('keydown', handleKeyDown)
      el.addEventListener('compositionstart', handleCompositionStart)
      el.addEventListener('compositionend', handleCompositionEnd)

      return () => {
        el.removeEventListener('keydown', handleKeyDown)
        el.removeEventListener('compositionstart', handleCompositionStart)
        el.removeEventListener('compositionend', handleCompositionEnd)
      }
    } catch (_) {}
  }, [handleSend, handleCompositionStart, handleCompositionEnd])

  // Handle Taro onInput event
  const handleInput = useCallback((e: any) => {
    setValue(e.detail.value)
  }, [])

  const isDisabled = disabled || loading
  const canSend = value.trim().length > 0 && !isDisabled

  return (
    <View className={`chat-input-container ${isFocused ? 'focused' : ''}`}>
      <View className='chat-input-wrapper'>
        <Textarea
          ref={textareaRef}
          className={`chat-input-field ${isDisabled ? 'disabled' : ''}`}
          value={value}
          placeholder={placeholder}
          placeholderClass='chat-input-placeholder'
          disabled={isDisabled}
          maxlength={-1}
          autoHeight
          showConfirmBar={false}
          adjustPosition={false}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onConfirm={handleSend}
        />

        {loading ? (
          <View
            className='chat-stop-btn'
            onClick={onStop}
          >
            <Text className='chat-stop-icon'>■</Text>
          </View>
        ) : (
          <View
            className={`chat-send-btn ${canSend ? 'active' : ''}`}
            onClick={handleSend}
          >
            <Text className='chat-send-icon'>↑</Text>
          </View>
        )}
      </View>
    </View>
  )
}
