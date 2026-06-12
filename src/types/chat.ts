/**
 * AgentHub Chat Types
 * Based on harnss UIMessage, adapted for Taro + FastAPI
 */

// ── Tool Use Result ──

export interface ToolUseResult {
  content?: string
  error?: string
  [key: string]: unknown
}

// ── Subagent Steps ──

export interface SubagentToolStep {
  toolName: string
  toolInput: Record<string, unknown>
  toolResult?: ToolUseResult
  toolUseId: string
  toolError?: boolean
}

// ── Image Attachment ──

export interface ImageAttachment {
  url: string
  base64?: string
  mediaType?: string
  width?: number
  height?: number
}

// ── UIMessage - Core message type ──

export interface UIMessage {
  id: string
  role: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'system' | 'summary'
  content: string
  
  // Tool call fields
  toolName?: string
  toolInput?: Record<string, unknown>
  toolResult?: ToolUseResult
  toolError?: boolean
  
  // Thinking/reasoning
  thinking?: string
  thinkingComplete?: boolean
  
  // Streaming state
  isStreaming?: boolean
  
  // Timestamp
  timestamp: number
  
  // Subagent support
  subagentId?: string
  subagentSteps?: SubagentToolStep[]
  subagentStatus?: 'running' | 'completed'
  subagentDurationMs?: number
  subagentTokens?: number
  
  // Attachments
  images?: ImageAttachment[]
  
  // Display helpers
  displayContent?: string
  
  // Error state
  isError?: boolean
}

// ── Tool Types ──

export type ToolId = 
  | 'terminal' 
  | 'browser' 
  | 'git' 
  | 'files' 
  | 'mcp'
  | 'search'
  | 'read'
  | 'write'
  | 'edit'
  | 'task'

export interface ToolDef {
  id: ToolId
  label: string
  icon?: string
}

// ── Conversation ──

export interface ConversationSummary {
  conversation_id: string
  last_message_at: number
  message_count: number
  last_message?: string
}

export interface ConversationDetail {
  conversation_id: string
  messages: Array<{
    role: string
    content: string
    tool_calls?: Array<{
      id: string
      function: {
        name: string
        arguments: string
      }
    }>
    tool_call_id?: string
  }>
}

// ── Agent Chat Session ──

export interface ChatSession {
  id: string
  agentId: string
  conversationId?: string
  title: string
  messages: UIMessage[]
  createdAt: number
  lastMessageAt?: number
  isProcessing?: boolean
}

// ── Runtime Status ──

export interface ChatRuntimeStatus {
  configured: boolean
  provider: string
  model: string
  streaming?: boolean
}

// ── Permission (for agent tool approval) ──

export interface PermissionRequest {
  requestId: string
  toolName: string
  toolInput: Record<string, unknown>
  message?: string
}

// ── Helper functions ──

export function createUserMessage(content: string, images?: ImageAttachment[]): UIMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: 'user',
    content,
    timestamp: Date.now(),
    images,
  }
}

export function createAssistantMessage(content: string): UIMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: 'assistant',
    content,
    timestamp: Date.now(),
  }
}

export function createToolCallMessage(
  toolName: string,
  toolInput: Record<string, unknown>,
  toolResult?: ToolUseResult,
  toolError?: boolean
): UIMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: 'tool_call',
    content: '',
    toolName,
    toolInput,
    toolResult,
    toolError,
    timestamp: Date.now(),
  }
}

export function createSystemMessage(content: string): UIMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: 'system',
    content,
    timestamp: Date.now(),
  }
}

export function createErrorMessage(content: string): UIMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: 'system',
    content,
    isError: true,
    timestamp: Date.now(),
  }
}

export function nextId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
