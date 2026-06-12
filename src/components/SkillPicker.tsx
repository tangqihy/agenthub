/**
 * SkillPicker - Skills选择组件
 * 用于在Agent编辑器中选择skills
 */
import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import './SkillPicker.scss'

interface Skill {
  name: string
  description: string
  category: string
  path: string
  tags: string[]
}

interface SkillPickerProps {
  selected: string[]
  onChange: (skills: string[]) => void
}

const CATEGORY_ICONS: Record<string, string> = {
  'finance': '💰',
  'github': '🐙',
  'devops': '🔧',
  'creative': '🎨',
  'data-science': '📊',
  'research': '🔬',
  'frontend': '💻',
  'gaming': '🎮',
  'media': '🎬',
  'productivity': '📝',
}

export function SkillPicker({ selected, onChange }: SkillPickerProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  // 加载skills列表
  const loadSkills = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.skillsList({ limit: 200 })
      setSkills(data)
    } catch (err) {
      console.error('Failed to load skills:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  // 过滤skills
  const filteredSkills = skills.filter((skill) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      skill.name.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query) ||
      skill.category.toLowerCase().includes(query)
    )
  })

  // 切换skill选中状态
  const toggleSkill = useCallback((name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name))
    } else {
      onChange([...selected, name])
    }
  }, [selected, onChange])

  // 移除skill
  const removeSkill = useCallback((name: string) => {
    onChange(selected.filter((s) => s !== name))
  }, [selected, onChange])

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    return CATEGORY_ICONS[category.toLowerCase()] || '📦'
  }

  return (
    <View className='skill-picker'>
      {/* 已选skills */}
      {selected.length > 0 && (
        <View className='selected-skills'>
          <Text className='selected-label'>已选 Skills:</Text>
          <View className='selected-list'>
            {selected.map((name) => (
              <View key={name} className='selected-chip'>
                <Text className='chip-text'>{name}</Text>
                <Text
                  className='chip-remove'
                  onClick={() => removeSkill(name)}
                >
                  ✕
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 展开/收起按钮 */}
      <View
        className='toggle-btn'
        onClick={() => setExpanded(!expanded)}
      >
        <Text className='toggle-text'>
          {expanded ? '收起 Skills 列表' : '展开 Skills 列表'}
        </Text>
        <Text className='toggle-icon'>{expanded ? '▲' : '▼'}</Text>
      </View>

      {/* Skills列表 */}
      {expanded && (
        <View className='skills-panel'>
          {/* 搜索 */}
          <View className='picker-search'>
            <Input
              className='search-input'
              placeholder='搜索 Skills...'
              value={searchQuery}
              onInput={(e) => setSearchQuery(e.detail.value)}
            />
          </View>

          {/* 列表 */}
          <ScrollView className='skills-scroll' scrollY>
            {loading ? (
              <View className='picker-loading'>
                <Text className='loading-text'>加载中...</Text>
              </View>
            ) : filteredSkills.length === 0 ? (
              <View className='picker-empty'>
                <Text className='empty-text'>没有找到 Skills</Text>
              </View>
            ) : (
              filteredSkills.map((skill) => {
                const isSelected = selected.includes(skill.name)
                return (
                  <View
                    key={skill.path}
                    className={`picker-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSkill(skill.name)}
                  >
                    <View className='item-info'>
                      <Text className='item-icon'>{getCategoryIcon(skill.category)}</Text>
                      <View className='item-meta'>
                        <Text className='item-name'>{skill.name}</Text>
                        <Text className='item-category'>{skill.category}</Text>
                      </View>
                    </View>
                    <View className='item-check'>
                      <Text className='check-icon'>{isSelected ? '✓' : ''}</Text>
                    </View>
                  </View>
                )
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  )
}
