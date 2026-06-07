import { View, Text, Input, Textarea } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import type { Agent } from '../../services/types'
import BottomNav from '../../components/BottomNav'
import '../../app.scss'
import './editor.scss'

const RUNTIME_OPTIONS = [
  { value: 'hermes', label: 'Hermes' },
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'codex', label: 'Codex' },
  { value: 'opencode', label: 'OpenCode' },
  { value: 'custom', label: 'Custom' },
]

export default function AgentEditorPage() {
  const router = useRouter()
  const agentId = router.params.id || ''
  const isEdit = !!agentId

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [avatar, setAvatar] = useState('🤖')
  const [runtime, setRuntime] = useState('hermes')
  const [model, setModel] = useState('')
  const [prompt, setPrompt] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [mcp, setMcp] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [newMcp, setNewMcp] = useState('')
  const [runtimeOpen, setRuntimeOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingAgent, setLoadingAgent] = useState(false)

  // V2.1 Notes fields
  const [notes, setNotes] = useState('')
  const [useCases, setUseCases] = useState('')
  const [caveats, setCaveats] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => {
    if (!agentId) return
    setLoadingAgent(true)
    api.agent(agentId).then((agent: Agent) => {
      setName(agent.name)
      setDescription(agent.description || '')
      setAvatar(agent.avatar || '🤖')
      setRuntime(agent.runtime || 'hermes')
      setNotes(agent.notes || '')
      setUseCases(agent.use_cases || '')
      setCaveats(agent.caveats || '')
      setLoadingAgent(false)
    }).catch(() => setLoadingAgent(false))
  }, [agentId])

  const handleAddSkill = () => {
    const v = newSkill.trim()
    if (v && !skills.includes(v)) {
      setSkills([...skills, v])
      setNewSkill('')
    }
  }

  const handleRemoveSkill = (idx: number) => {
    setSkills(skills.filter((_, i) => i !== idx))
  }

  const handleAddMcp = () => {
    const v = newMcp.trim()
    if (v && !mcp.includes(v)) {
      setMcp([...mcp, v])
      setNewMcp('')
    }
  }

  const handleRemoveMcp = (idx: number) => {
    setMcp(mcp.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入名称', icon: 'error' })
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        const config_json: Record<string, unknown> = {}
        if (model) config_json.model = model
        if (prompt) config_json.prompt = prompt
        if (skills.length > 0) config_json.skills = skills
        if (mcp.length > 0) config_json.mcp = mcp
        if (notes) config_json.notes = notes
        if (useCases) config_json.use_cases = useCases
        if (caveats) config_json.caveats = caveats
        await api.agentVersionCreate(agentId, config_json)
        Taro.showToast({ title: '新版本已保存', icon: 'success' })
      } else {
        const config: Record<string, unknown> = {}
        if (model) config.model = model
        if (prompt) config.prompt = prompt
        if (skills.length > 0) config.skills = skills
        if (mcp.length > 0) config.mcp = mcp
        if (notes) config.notes = notes
        if (useCases) config.use_cases = useCases
        if (caveats) config.caveats = caveats
        await api.agentCreate({
          name: name.trim(),
          description: description.trim() || undefined,
          avatar,
          runtime,
          config,
        })
        Taro.showToast({ title: 'Agent 已创建', icon: 'success' })
      }
      setTimeout(() => Taro.navigateBack(), 800)
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loadingAgent) {
    return <View className='page'>加载中...</View>
  }

  return (
    <View className='page'>
      <View className='editor-header'>
        <Text className='editor-title'>{isEdit ? '编辑 Agent' : '创建 Agent'}</Text>
      </View>

      {/* Basic Info */}
      <View className='section'>
        <Text className='section__title'>基本信息</Text>

        <View className='editor-field'>
          <Text className='editor-label'>名称</Text>
          <Input
            className='editor-input'
            placeholder='Agent 名称'
            value={name}
            onInput={(e) => setName(e.detail.value)}
            maxlength={50}
          />
        </View>

        <View className='editor-field'>
          <Text className='editor-label'>描述</Text>
          <Textarea
            className='editor-textarea'
            placeholder='Agent 功能描述'
            value={description}
            onInput={(e) => setDescription(e.detail.value)}
            maxlength={200}
            autoHeight
          />
        </View>

        <View className='editor-field'>
          <Text className='editor-label'>头像</Text>
          <Input
            className='editor-input editor-input--short'
            placeholder='🤖'
            value={avatar}
            onInput={(e) => setAvatar(e.detail.value)}
            maxlength={4}
          />
        </View>

        <View className='editor-field'>
          <Text className='editor-label'>运行时</Text>
          <View className='editor-dropdown' onClick={() => setRuntimeOpen(!runtimeOpen)}>
            <Text className='editor-dropdown__value'>
              {RUNTIME_OPTIONS.find((r) => r.value === runtime)?.label || runtime}
            </Text>
            <Text className='editor-dropdown__arrow'>{runtimeOpen ? '▲' : '▼'}</Text>
          </View>
          {runtimeOpen && (
            <View className='editor-dropdown__list'>
              {RUNTIME_OPTIONS.map((opt) => (
                <View
                  key={opt.value}
                  className={`editor-dropdown__item ${runtime === opt.value ? 'editor-dropdown__item--active' : ''}`}
                  onClick={() => {
                    setRuntime(opt.value)
                    setRuntimeOpen(false)
                  }}
                >
                  <Text className='editor-dropdown__item-text'>{opt.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Config */}
      <View className='section'>
        <Text className='section__title'>配置</Text>

        <View className='editor-field'>
          <Text className='editor-label'>模型</Text>
          <Input
            className='editor-input'
            placeholder='例: gpt-4o, claude-3.5-sonnet'
            value={model}
            onInput={(e) => setModel(e.detail.value)}
          />
        </View>

        <View className='editor-field'>
          <Text className='editor-label'>System Prompt</Text>
          <Textarea
            className='editor-textarea editor-textarea--tall'
            placeholder='Agent 的系统提示词...'
            value={prompt}
            onInput={(e) => setPrompt(e.detail.value)}
            autoHeight
            maxlength={4000}
          />
        </View>

        {/* Skills */}
        <View className='editor-field'>
          <Text className='editor-label'>Skills</Text>
          <View className='editor-tag-list'>
            {skills.map((s, i) => (
              <View key={`${s}-${i}`} className='editor-tag'>
                <Text className='editor-tag__text'>{s}</Text>
                <Text className='editor-tag__remove' onClick={() => handleRemoveSkill(i)}>✕</Text>
              </View>
            ))}
          </View>
          <View className='editor-add-row'>
            <Input
              className='editor-input editor-input--flex'
              placeholder='添加 skill...'
              value={newSkill}
              onInput={(e) => setNewSkill(e.detail.value)}
              onConfirm={handleAddSkill}
              confirmType='done'
            />
            <View className='editor-add-btn' onClick={handleAddSkill}>
              <Text className='editor-add-btn__text'>+</Text>
            </View>
          </View>
        </View>

        {/* MCP */}
        <View className='editor-field'>
          <Text className='editor-label'>MCP Servers</Text>
          <View className='editor-tag-list'>
            {mcp.map((s, i) => (
              <View key={`${s}-${i}`} className='editor-tag editor-tag--mcp'>
                <Text className='editor-tag__text'>{s}</Text>
                <Text className='editor-tag__remove' onClick={() => handleRemoveMcp(i)}>✕</Text>
              </View>
            ))}
          </View>
          <View className='editor-add-row'>
            <Input
              className='editor-input editor-input--flex'
              placeholder='添加 MCP server...'
              value={newMcp}
              onInput={(e) => setNewMcp(e.detail.value)}
              onConfirm={handleAddMcp}
              confirmType='done'
            />
            <View className='editor-add-btn' onClick={handleAddMcp}>
              <Text className='editor-add-btn__text'>+</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Advanced Settings — Notes */}
      <View className='section'>
        <View
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: advancedOpen ? 14 : 0 }}
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          <Text className='section__title' style={{ marginBottom: 0 }}>高级设置</Text>
          <Text style={{ fontSize: 12, color: 'var(--text-muted)' }}>{advancedOpen ? '收起 ▲' : '展开 ▼'}</Text>
        </View>
        {advancedOpen && (
          <View>
            <View className='editor-field'>
              <Text className='editor-label'>使用说明</Text>
              <Textarea
                className='editor-textarea'
                placeholder='描述如何使用此 Agent...'
                value={notes}
                onInput={(e) => setNotes(e.detail.value)}
                autoHeight
                maxlength={2000}
              />
            </View>

            <View className='editor-field'>
              <Text className='editor-label'>适用场景</Text>
              <Textarea
                className='editor-textarea'
                placeholder='此 Agent 适用于哪些场景...'
                value={useCases}
                onInput={(e) => setUseCases(e.detail.value)}
                autoHeight
                maxlength={2000}
              />
            </View>

            <View className='editor-field'>
              <Text className='editor-label'>注意事项</Text>
              <Textarea
                className='editor-textarea'
                placeholder='使用此 Agent 时需要注意什么...'
                value={caveats}
                onInput={(e) => setCaveats(e.detail.value)}
                autoHeight
                maxlength={2000}
              />
            </View>
          </View>
        )}
      </View>

      {/* Save Button */}
      <View
        className={`editor-save ${saving ? 'editor-save--loading' : ''}`}
        onClick={!saving ? handleSave : undefined}
      >
        <Text className='editor-save__text'>
          {saving ? '保存中...' : isEdit ? '保存新版本' : '创建 Agent'}
        </Text>
      </View>

      <BottomNav active='/pages/agents/index' />
    </View>
  )
}
