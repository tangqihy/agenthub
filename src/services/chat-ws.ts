/**
 * Chat WebSocket Client
 * Handles streaming chat with agent
 */

type MessageHandler = (data: any) => void

interface ChatWSOptions {
  agentId: string
  token?: string
  onMessage?: MessageHandler
  onError?: (error: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export class ChatWebSocket {
  private ws: WebSocket | null = null
  private agentId: string
  private token: string
  private handlers: {
    message: MessageHandler[]
    error: ((error: string) => void)[]
    connect: (() => void)[]
    disconnect: (() => void)[]
  } = {
    message: [],
    error: [],
    connect: [],
    disconnect: [],
  }
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private pingInterval: ReturnType<typeof setInterval> | null = null

  constructor(options: ChatWSOptions) {
    this.agentId = options.agentId
    this.token = options.token || ''
    
    if (options.onMessage) this.on('message', options.onMessage)
    if (options.onError) this.on('error', options.onError)
    if (options.onConnect) this.on('connect', options.onConnect)
    if (options.onDisconnect) this.on('disconnect', options.onDisconnect)
  }

  /**
   * Connect to WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      // Build WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const url = `${protocol}//${host}/api/v2/agents/${this.agentId}/chat/stream`

      try {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('[ChatWS] Connected')
          this.reconnectAttempts = 0
          this.startPing()
          this.emit('connect')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.emit('message', data)
          } catch (err) {
            console.error('[ChatWS] Failed to parse message:', err)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[ChatWS] Error:', error)
          this.emit('error', 'WebSocket error')
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log('[ChatWS] Disconnected:', event.code, event.reason)
          this.stopPing()
          this.emit('disconnect')

          // Auto reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
            console.log(`[ChatWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
            this.reconnectTimeout = setTimeout(() => this.connect(), delay)
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.stopPing()
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnect
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Send message to agent
   */
  send(message: string, conversationId?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emit('error', 'WebSocket not connected')
      return
    }

    this.ws.send(JSON.stringify({
      type: 'chat',
      message,
      conversation_id: conversationId,
    }))
  }

  /**
   * Register event handler
   */
  on(event: 'message', handler: MessageHandler): void
  on(event: 'error', handler: (error: string) => void): void
  on(event: 'connect', handler: () => void): void
  on(event: 'disconnect', handler: () => void): void
  on(event: string, handler: any): void {
    const key = event as keyof typeof this.handlers
    if (this.handlers[key]) {
      (this.handlers[key] as any[]).push(handler)
    }
  }

  /**
   * Remove event handler
   */
  off(event: string, handler: any): void {
    const key = event as keyof typeof this.handlers
    if (this.handlers[key]) {
      this.handlers[key] = (this.handlers[key] as any[]).filter(h => h !== handler)
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: any[]): void {
    const key = event as keyof typeof this.handlers
    if (this.handlers[key]) {
      (this.handlers[key] as any[]).forEach(handler => handler(...args))
    }
  }

  /**
   * Start ping interval
   */
  private startPing(): void {
    this.stopPing()
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

/**
 * Create a chat WebSocket client
 */
export function createChatWS(options: ChatWSOptions): ChatWebSocket {
  return new ChatWebSocket(options)
}
