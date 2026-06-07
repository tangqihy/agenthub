import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { api, setAuthToken } from '../../services/api'
import '../../app.scss'
import './index.scss'

export default function LoginPage() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!token.trim()) {
      setError('请输入 Token')
      return
    }
    setLoading(true)
    setError('')
    try {
      setAuthToken(token.trim())
      // Verify the token works
      await api.authVerify()
      // Store token
      try { Taro.setStorageSync('agenthub_token', token.trim()) } catch {}
      Taro.reLaunch({ url: '/pages/dashboard/index' })
    } catch {
      setAuthToken('')
      try { Taro.removeStorageSync('agenthub_token') } catch {}
      setError('Token 无效，请重新输入')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='page login-page'>
      <View className='login-card'>
        <Text className='login-icon'>🔐</Text>
        <Text className='login-title'>AgentHub</Text>
        <Text className='login-subtitle'>输入访问令牌以继续</Text>

        <Input
          className='login-input'
          placeholder='输入 Token...'
          password
          value={token}
          onInput={(e) => setToken(e.detail.value)}
          onConfirm={handleLogin}
        />

        {error ? <Text className='login-error'>{error}</Text> : null}

        <View className='login-btn' onClick={handleLogin}>
          <Text className='login-btn__text'>{loading ? '验证中...' : '登 录'}</Text>
        </View>
      </View>
    </View>
  )
}
