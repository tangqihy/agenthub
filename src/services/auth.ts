import Taro from '@tarojs/taro'
import { setAuthToken, getAuthToken, api } from './api'

const TOKEN_KEY = 'agenthub_token'
const AUTH_REQUIRED_KEY = 'agenthub_auth_required'

class AuthManager {
  private authRequired: boolean | null = null

  constructor() {
    // Load token from storage on init
    try {
      const stored = Taro.getStorageSync(TOKEN_KEY)
      if (stored) {
        setAuthToken(stored)
      }
    } catch {}
  }

  setToken(token: string) {
    setAuthToken(token)
    try { Taro.setStorageSync(TOKEN_KEY, token) } catch {}
  }

  getToken(): string {
    return getAuthToken()
  }

  clearToken() {
    setAuthToken('')
    try { Taro.removeStorageSync(TOKEN_KEY) } catch {}
  }

  setAuthRequired(required: boolean) {
    this.authRequired = required
    try { Taro.setStorageSync(AUTH_REQUIRED_KEY, required ? '1' : '0') } catch {}
  }

  isAuthRequired(): boolean {
    if (this.authRequired !== null) return this.authRequired
    try {
      const stored = Taro.getStorageSync(AUTH_REQUIRED_KEY)
      return stored === '1'
    } catch {}
    return false
  }

  async verify(): Promise<boolean> {
    try {
      await api.authVerify()
      return true
    } catch {
      return false
    }
  }

  async checkAuthRequired(): Promise<boolean> {
    try {
      const config = await api.authConfig()
      this.setAuthRequired(config.auth_required)
      return config.auth_required
    } catch {
      return false
    }
  }
}

export const auth = new AuthManager()
