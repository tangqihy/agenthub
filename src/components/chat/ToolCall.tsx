/**
 * ToolCall - 工具调用卡片展示
 * Based on harnss ToolCall, adapted for Taro
 */
import { View, Text } from '@tarojs/components'
import { useState, useMemo, useCallback } from 'react'
import type { UIMessage } from '../../types/chat'
import { BashContent } from './tool-renderers/BashContent'
import { EditContent } from './tool-renderers/EditContent'
import { ReadContent } from './tool-renderers/ReadContent'
import { SearchContent } from './tool-renderers/SearchContent'
import { GenericContent } from './tool-renderers/GenericContent'
import './ToolCall.scss'

interface ToolCallProps {
  message: UIMessage
  autoExpand?: boolean
}

// Tool icon mapping
const TOOL_ICONS: Record<string, string> = {
  bash: '💻',
  terminal: '💻',
  read: '📖',
  write: '✏️',
  edit: '✏️',
  search: '🔍',
  grep: '🔍',
  glob: '🔍',
  web_search: '🌐',
  web_fetch: '🌐',
  task: '📋',
  agent: '🤖',
  todo_write: '📝',
  memory: '🧠',
  skill: '📚',
  browser: '🌐',
}

// Tool label mapping
const TOOL_LABELS: Record<string, string> = {
  bash: '执行命令',
  terminal: '执行命令',
  read: '读取文件',
  write: '写入文件',
  edit: '编辑文件',
  search: '搜索',
  grep: '搜索',
  glob: '查找文件',
  web_search: '网络搜索',
  web_fetch: '获取网页',
  task: '子任务',
  agent: 'Agent调用',
  todo_write: '更新待办',
  memory: '记忆操作',
  skill: '技能调用',
  browser: '浏览器操作',
}

// Get tool icon
function getToolIcon(toolName: string): string {
  const normalized = toolName.toLowerCase().replace(/[_-]/g, '')
  return TOOL_ICONS[normalized] || '🔧'
}

// Get tool label
function getToolLabel(toolName: string): string {
  const normalized = toolName.toLowerCase().replace(/[_-]/g, '')
  return TOOL_LABELS[normalized] || toolName
}

// Render tool content based on tool type
function ToolContent({ message }: { message: UIMessage }) {
  const toolName = (message.toolName || '').toLowerCase()
  
  switch (toolName) {
    case 'bash':
    case 'terminal':
      return <BashContent message={message} />
    case 'edit':
    case 'write':
      return <EditContent message={message} />
    case 'read':
      return <ReadContent message={message} />
    case 'search':
    case 'grep':
    case 'glob':
      return <SearchContent message={message} />
    default:
      return <GenericContent message={message} />
  }
}

export function ToolCall({ message, autoExpand = false }: ToolCallProps) {
  const [expanded, setExpanded] = useState(autoExpand)
  
  const toolName = message.toolName || 'unknown'
  const icon = getToolIcon(toolName)
  const label = getToolLabel(toolName)
  const hasError = message.toolError
  
  // Format tool input summary
  const inputSummary = useMemo(() => {
    if (!message.toolInput) return ''
    
    const input = message.toolInput
    
    // Bash command
    if (toolName === 'bash' || toolName === 'terminal') {
      return input.command ? `$ ${input.command}` : ''
    }
    
    // File operations
    if (toolName === 'read' || toolName === 'write' || toolName === 'edit') {
      return input.file_path || input.path || ''
    }
    
    // Search
    if (toolName === 'search' || toolName === 'grep') {
      return input.query || input.pattern || ''
    }
    
    // Task/Agent
    if (toolName === 'task' || toolName === 'agent') {
      return input.description || input.prompt || ''
    }
    
    // Generic: show first key
    const keys = Object.keys(input)
    if (keys.length > 0) {
      const firstKey = keys[0]
      const value = input[firstKey]
      if (typeof value === 'string') {
        return value.length > 50 ? value.slice(0, 50) + '...' : value
      }
    }
    
    return ''
  }, [message.toolInput, toolName])
  
  // Format result summary
  const resultSummary = useMemo(() => {
    if (!message.toolResult) return ''
    
    const result = message.toolResult
    if (result.error) return `错误: ${result.error}`
    if (result.content) {
      const content = result.content
      return content.length > 100 ? content.slice(0, 100) + '...' : content
    }
    
    return ''
  }, [message.toolResult])
  
  const toggleExpand = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])
  
  return (
    <View className={`tool-call ${hasError ? 'tool-error' : ''}`}>
      {/* Tool header */}
      <View className='tool-header' onClick={toggleExpand}>
        <View className='tool-info'>
          <Text className='tool-icon'>{icon}</Text>
          <Text className='tool-label'>{label}</Text>
          {hasError && <Text className='tool-error-badge'>❌ 错误</Text>}
        </View>
        <View className='tool-toggle'>
          <Text className='toggle-icon'>{expanded ? '▼' : '▶'}</Text>
        </View>
      </View>
      
      {/* Input summary (always visible) */}
      {inputSummary && (
        <View className='tool-input-summary'>
          <Text className='summary-text'>{inputSummary}</Text>
        </View>
      )}
      
      {/* Expanded content */}
      {expanded && (
        <View className='tool-content'>
          <ToolContent message={message} />
        </View>
      )}
      
      {/* Result summary (when collapsed) */}
      {!expanded && resultSummary && (
        <View className='tool-result-summary'>
          <Text className='result-text'>{resultSummary}</Text>
        </View>
      )}
    </View>
  )
}
