import { View, Text } from '@tarojs/components'
import AppLayout from '../../components/Layout/AppLayout'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import '../../app.scss'
import './index.scss'

type Theme = 'dark' | 'light'

const THEME_LABELS: Record<Theme, string> = {
  dark: '深色模式',
  light: '浅色模式',
}

const THEME_ICONS: Record<Theme, string> = {
  dark: '🌙',
  light: '☀️',
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [apiUrl, setApiUrl] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'disconnected'>('idle')
  const [testing, setTesting] = useState(false)

  // Load saved theme on mount
  useEffect(() => {
    try {
      const saved = Taro.getStorageSync('agenthub_theme') as Theme
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved)
        applyTheme(saved)
      } else {
        // Default: read current attribute or fallback to dark
        const current = (document.documentElement.getAttribute('data-theme') || 'dark') as Theme
        setTheme(current)
      }
    } catch {
      // fallback already set in state
    }
  }, [])

  // Load API base URL on mount
  useEffect(() => {
    // Mirror the same logic from api.ts
    const base = process.env.TARO_ENV === 'h5' ? window.location.origin : 'http://127.0.0.1:8000'
    setApiUrl(base)
  }, [])

  const applyTheme = (t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
  }

  const handleThemeChange = (t: Theme) => {
    setTheme(t)
    applyTheme(t)
    try {
      Taro.setStorageSync('agenthub_theme', t)
    } catch {}
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setConnectionStatus('idle')
    try {
      await api.authConfig()
      setConnectionStatus('connected')
    } catch {
      setConnectionStatus('disconnected')
    } finally {
      setTesting(false)
    }
  }

  const handleGoBack = () => {
    Taro.navigateBack().catch(() => {
      Taro.reLaunch({ url: '/pages/dashboard/index' })
    })
  }

  return (
      <AppLayout>
    <View className='page settings-page'>
      {/* Navigation Bar */}
      <View className='settings-navbar'>
        <View className='settings-navbar__back' onClick={handleGoBack}>
          <Text className='settings-navbar__back-icon'>←</Text>
        </View>
        <Text className='settings-navbar__title'>设置</Text>
        <View className='settings-navbar__spacer' />
      </View>

      {/* Theme Section */}
      <View className='settings-section'>
        <Text className='settings-section__title'>外观</Text>
        <View className='settings-card'>
          {(Object.keys(THEME_LABELS) as Theme[]).map((t) => (
            <View
              key={t}
              className={`settings-theme-option ${theme === t ? 'settings-theme-option--active' : ''}`}
              onClick={() => handleThemeChange(t)}
            >
              <View className='settings-theme-option__radio'>
                {theme === t && <View className='settings-theme-option__radio-dot' />}
              </View>
              <Text className='settings-theme-option__icon'>{THEME_ICONS[t]}</Text>
              <Text className='settings-theme-option__label'>{THEME_LABELS[t]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* API Configuration Section */}
      <View className='settings-section'>
        <Text className='settings-section__title'>API 配置</Text>
        <View className='settings-card'>
          <View className='settings-row'>
            <Text className='settings-row__label'>API 地址</Text>
            <Text className='settings-row__value settings-row__value--mono'>{apiUrl || '加载中...'}</Text>
          </View>
          <View className='settings-divider' />
          <View className='settings-row'>
            <Text className='settings-row__label'>连接状态</Text>
            <View className='settings-row__status'>
              <View
                className={`settings-status-dot settings-status-dot--${connectionStatus}`}
              />
              <Text className='settings-row__status-text'>
                {connectionStatus === 'idle' && '未测试'}
                {connectionStatus === 'connected' && '已连接'}
                {connectionStatus === 'disconnected' && '未连接'}
              </Text>
            </View>
          </View>
          <View className='settings-divider' />
          <View
            className={`settings-btn ${testing ? 'settings-btn--disabled' : ''}`}
            onClick={!testing ? handleTestConnection : undefined}
          >
            <Text className='settings-btn__text'>
              {testing ? '测试中...' : '测试连接'}
            </Text>
          </View>
        </View>
      </View>

      {/* About Section */}
      <View className='settings-section'>
        <Text className='settings-section__title'>关于</Text>
        <View className='settings-card'>
          <View className='settings-row'>
            <Text className='settings-row__label'>应用名称</Text>
            <Text className='settings-row__value'>AgentHub</Text>
          </View>
          <View className='settings-divider' />
          <View className='settings-row'>
            <Text className='settings-row__label'>版本</Text>
            <Text className='settings-row__value'>2.0.0</Text>
          </View>
          <View className='settings-divider' />
          <View className='settings-row'>
            <Text className='settings-row__label'>描述</Text>
            <Text className='settings-row__value'>AI Agent 管理平台</Text>
          </View>
          <View className='settings-divider' />
          <View
            className='settings-row settings-row--link'
            onClick={() => {
              Taro.setClipboardData({
                data: 'https://github.com/NousResearch/agenthub',
                success: () => {
                  Taro.showToast({ title: '已复制链接', icon: 'success' })
                },
              })
            }}
          >
            <Text className='settings-row__label'>GitHub</Text>
            <Text className='settings-row__value settings-row__value--link'>
              NousResearch/agenthub ↗
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View className='settings-footer'>
        <Text className='settings-footer__text'>AgentHub © 2025</Text>
      </View>
    </View>
      </AppLayout>)
}
