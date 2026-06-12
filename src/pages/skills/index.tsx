/**
 * SkillsPage - Skills市场页面
 * 支持本地skills + OpenClaw水产市场
 */
import { View, Text, Input, ScrollView } from '@tarojs/components'
import AppLayout from '../../components/Layout/AppLayout'
import Taro from '@tarojs/taro'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import BottomNav from '../../components/BottomNav'
import '../../app.scss'
import './index.scss'

interface Skill {
  name: string
  description: string
  category: string
  path: string
  source: string
  tags: string[]
  installs: number
  stars: number
}

const SOURCE_TABS = [
  { key: 'local', label: '本地', icon: '💻' },
  { key: 'mercury', label: 'Mercury', icon: '🌐' },
  { key: 'all', label: '全部', icon: '📋' },
]

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSource, setSelectedSource] = useState('local')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // 加载skills列表
  const loadSkills = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.skillsList({
        source: selectedSource,
        search: searchQuery || undefined,
        limit: 100,
      })
      setSkills(data)
    } catch (err) {
      console.error('Failed to load skills:', err)
      Taro.showToast({ title: '加载失败', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }, [selectedSource, searchQuery])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  // 复制skill名称
  const handleCopySkill = useCallback((name: string) => {
    Taro.setClipboardData({
      data: name,
      success: () => {
        Taro.showToast({ title: '已复制', icon: 'success' })
      }
    })
  }, [])

  return (
      <AppLayout>
    <View className='page'>
      {/* Header */}
      <View className='skills-header'>
        <Text className='skills-title'>🎯 Skills 市场</Text>
        <Text className='skills-subtitle'>发现和管理 Agent Skills</Text>
      </View>

      {/* Source Tabs */}
      <View className='source-tabs'>
        {SOURCE_TABS.map((tab) => (
          <View
            key={tab.key}
            className={`source-tab ${selectedSource === tab.key ? 'active' : ''}`}
            onClick={() => setSelectedSource(tab.key)}
          >
            <Text className='tab-icon'>{tab.icon}</Text>
            <Text className='tab-label'>{tab.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View className='skills-search'>
        <Input
          className='search-input'
          placeholder='搜索 Skills...'
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.detail.value)}
        />
      </View>

      {/* Skills List */}
      <ScrollView className='skills-list' scrollY>
        {loading ? (
          <View className='loading-state'>
            <Text className='loading-text'>加载中...</Text>
          </View>
        ) : skills.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>📭</Text>
            <Text className='empty-text'>没有找到 Skills</Text>
            {selectedSource === 'local' && (
              <Text className='empty-hint'>切换到「Mercury」查看在线 Skills</Text>
            )}
          </View>
        ) : (
          skills.map((skill, index) => (
            <View
              key={`${skill.source}-${skill.name}-${index}`}
              className='skill-card'
            >
              <View className='skill-header'>
                <View className='skill-info'>
                  <Text className='skill-icon'>
                    {skill.source === 'mercury' ? '🌐' : '💻'}
                  </Text>
                  <View className='skill-meta'>
                    <Text className='skill-name'>{skill.name}</Text>
                    <View className='skill-badges'>
                      <Text className='skill-source'>
                        {skill.source === 'mercury' ? 'Mercury' : '本地'}
                      </Text>
                      {skill.category && (
                        <Text className='skill-category'>{skill.category}</Text>
                      )}
                    </View>
                  </View>
                </View>
                <View className='skill-actions'>
                  <View
                    className='copy-btn'
                    onClick={() => handleCopySkill(skill.name)}
                  >
                    <Text className='copy-icon'>📋</Text>
                  </View>
                </View>
              </View>
              
              <Text className='skill-desc'>{skill.description || '暂无描述'}</Text>
              
              {/* Stats */}
              {skill.source === 'openclawmp' && (skill.installs > 0 || skill.stars > 0) && (
                <View className='skill-stats'>
                  {skill.installs > 0 && (
                    <Text className='stat'>📥 {skill.installs}</Text>
                  )}
                  {skill.stars > 0 && (
                    <Text className='stat'>⭐ {skill.stars}</Text>
                  )}
                </View>
              )}
              
              {/* Tags */}
              {skill.tags && skill.tags.length > 0 && (
                <View className='skill-tags'>
                  {skill.tags.slice(0, 5).map((tag, i) => (
                    <Text key={i} className='skill-tag'>#{tag}</Text>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Stats */}
      <View className='skills-stats-bar'>
        <Text className='stats-text'>共 {skills.length} 个 Skills</Text>
      </View>

      <BottomNav active='skills' />
    </View>
      </AppLayout>)
}
