import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePolling } from '../../hooks/usePolling'
import { api } from '../../services/api'
import { sessionLabel, formatTokens, type Session } from '../../services/types'
import BottomNav from '../../components/BottomNav'
import SkeletonLoader from '../../components/SkeletonLoader'
import PageTransition from '../../components/PageTransition'
import '../../app.scss'
import './index.scss'

// ── Date grouping helpers ──────────────────────────────────────────────────

type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'older'

const GROUP_LABELS: Record<DateGroup, string> = {
  today: '今天',
  yesterday: '昨天',
  thisWeek: '本周',
  older: '更早',
}

const GROUP_ORDER: DateGroup[] = ['today', 'yesterday', 'thisWeek', 'older']

function getDateGroup(timestamp: number): DateGroup {
  const now = new Date()
  const date = new Date(timestamp * 1000)

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000)

  if (date >= startOfToday) return 'today'
  if (date >= startOfYesterday) return 'yesterday'
  if (date >= startOfWeek) return 'thisWeek'
  return 'older'
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const ts = timestamp * 1000
  const diff = now - ts
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ── Debounce hook ──────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

// ── Inline rename input ────────────────────────────────────────────────────

interface RenameInputProps {
  value: string
  onConfirm: (newTitle: string) => void
  onCancel: () => void
}

function RenameInput({ value, onConfirm, onCancel }: RenameInputProps) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<any>(null)

  useEffect(() => {
    // Auto-focus when mounted
    setTimeout(() => {
      inputRef.current?.focus?.()
    }, 100)
  }, [])

  const handleConfirm = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onConfirm(trimmed)
    } else {
      onCancel()
    }
  }, [draft, value, onConfirm, onCancel])

  return (
    <Input
      ref={inputRef}
      className='session-card__rename-input'
      value={draft}
      onInput={(e) => setDraft(e.detail.value)}
      onConfirm={handleConfirm}
      onBlur={handleConfirm}
    />
  )
}

// ── Session card component ─────────────────────────────────────────────────

interface SessionCardEnhancedProps {
  session: Session
  isActive: boolean
  isEditing: boolean
  onNavigate: () => void
  onStartEdit: () => void
  onConfirmEdit: (newTitle: string) => void
  onCancelEdit: () => void
  onDelete: () => void
}

function SessionCardEnhanced({
  session,
  isActive,
  isEditing,
  onNavigate,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onDelete,
}: SessionCardEnhancedProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const label = sessionLabel(session)
  const tokens = session.input_tokens + session.output_tokens

  const handleDeleteClick = useCallback((e: any) => {
    e.stopPropagation?.()
    if (showDeleteConfirm) {
      onDelete()
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
      // Auto-hide confirmation after 3s
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }, [showDeleteConfirm, onDelete])

  const handleEditClick = useCallback((e: any) => {
    e.stopPropagation?.()
    onStartEdit()
  }, [onStartEdit])

  return (
    <View
      className={`session-card ${isActive ? 'session-card--active' : ''}`}
      onClick={isEditing ? undefined : onNavigate}
    >
      <View className='session-card__indicator' />
      <View className='session-card__content'>
        {/* Header: title or rename input */}
        <View className='session-card__header'>
          {isEditing ? (
            <RenameInput
              value={session.title || session.external_id}
              onConfirm={onConfirmEdit}
              onCancel={onCancelEdit}
            />
          ) : (
            <Text className='session-card__title'>
              {session.title || session.external_id}
            </Text>
          )}
          <View className={`session-card__badge ${isActive ? 'session-card__badge--active' : ''}`}>
            <View className='session-card__dot' />
            <Text>{label}</Text>
          </View>
        </View>

        {/* Body: source, tokens, tool calls */}
        <View className='session-card__body'>
          <View className='session-card__meta'>
            <View className='session-card__tag'>
              <Text>{session.source}</Text>
            </View>
            {session.model && (
              <View className='session-card__tag'>
                <Text>{session.model}</Text>
              </View>
            )}
          </View>
          <View className='session-card__stats'>
            <Text className='session-card__stat'>📊 {formatTokens(tokens)}</Text>
            {session.tool_calls > 0 && (
              <Text className='session-card__stat'>🔧 {session.tool_calls}</Text>
            )}
            <Text className='session-card__time'>
              {formatRelativeTime(session.started_at)}
            </Text>
          </View>
        </View>

        {/* Actions row */}
        <View className='session-card__actions'>
          <View
            className='session-card__action-btn'
            onClick={handleEditClick}
          >
            <Text>✏️</Text>
          </View>
          <View
            className={`session-card__action-btn ${showDeleteConfirm ? 'session-card__action-btn--danger' : ''}`}
            onClick={handleDeleteClick}
          >
            <Text>{showDeleteConfirm ? '确认删除' : '🗑️'}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const { data: sessions, loading, error, refresh } = usePolling(
    () => api.sessions({ limit: 50 }),
    5000,
  )

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null)

  // Active session (first active one, or none)
  const activeSessionId = useMemo(
    () => sessions?.find((s) => s.is_active)?.id || null,
    [sessions],
  )

  // Filter sessions by search
  const filteredSessions = useMemo(() => {
    if (!sessions) return []
    if (!debouncedSearch) return sessions
    const q = debouncedSearch.toLowerCase()
    return sessions.filter(
      (s) =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.external_id || '').toLowerCase().includes(q) ||
        (s.source || '').toLowerCase().includes(q),
    )
  }, [sessions, debouncedSearch])

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: Record<DateGroup, Session[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    }
    for (const s of filteredSessions) {
      const group = getDateGroup(s.started_at)
      groups[group].push(s)
    }
    // Sort within each group by started_at descending
    for (const key of GROUP_ORDER) {
      groups[key].sort((a, b) => b.started_at - a.started_at)
    }
    return groups
  }, [filteredSessions])

  // Only show non-empty groups
  const visibleGroups = useMemo(
    () => GROUP_ORDER.filter((g) => groupedSessions[g].length > 0),
    [groupedSessions],
  )

  // Handlers
  const handleNavigate = useCallback((id: string) => {
    Taro.navigateTo({ url: `/pages/sessions/detail?id=${id}` })
  }, [])

  const handleStartEdit = useCallback((id: string) => {
    setEditingId(id)
  }, [])

  const handleConfirmEdit = useCallback(
    async (id: string, newTitle: string) => {
      setEditingId(null)
      try {
        // Optimistic update via local state
        await api.renameSession(id, newTitle)
        refresh()
      } catch {
        Taro.showToast({ title: '重命名失败', icon: 'error' })
      }
    },
    [refresh],
  )

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.deleteSession(id)
        Taro.showToast({ title: '已删除', icon: 'success' })
        refresh()
      } catch {
        Taro.showToast({ title: '删除失败', icon: 'error' })
      }
    },
    [refresh],
  )

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <View className='page sessions-page'>
        {/* Search bar */}
        <View className='sessions-search'>
          <View className='sessions-search__inner'>
            <Text className='sessions-search__icon'>🔍</Text>
            <Input
              className='sessions-search__input'
              placeholder='搜索会话...'
              value={searchQuery}
              onInput={(e) => setSearchQuery(e.detail.value)}
              confirmType='search'
            />
            {searchQuery && (
              <View
                className='sessions-search__clear'
                onClick={handleClearSearch}
              >
                <Text>✕</Text>
              </View>
            )}
          </View>
        </View>

        {/* Loading state */}
        {loading && !sessions && (
          <View className='section'>
            <SkeletonLoader rows={5} type='list' />
          </View>
        )}

        {/* Error state */}
        {error && (
          <View className='sessions-error'>
            <Text className='sessions-error__icon'>⚠️</Text>
            <Text className='sessions-error__text'>{error}</Text>
          </View>
        )}

        {/* Empty state */}
        {sessions && filteredSessions.length === 0 && (
          <View className='sessions-empty'>
            <Text className='sessions-empty__icon'>💬</Text>
            <Text className='sessions-empty__title'>
              {debouncedSearch ? '未找到匹配的会话' : '暂无会话'}
            </Text>
            <Text className='sessions-empty__subtitle'>
              {debouncedSearch
                ? '尝试使用不同的关键词搜索'
                : '创建一个新会话开始对话吧'}
            </Text>
          </View>
        )}

        {/* Grouped session list */}
        {visibleGroups.map((groupKey) => (
          <View key={groupKey} className='sessions-group'>
            <View className='sessions-group__header'>
              <Text className='sessions-group__label'>
                {GROUP_LABELS[groupKey]}
              </Text>
              <Text className='sessions-group__count'>
                {groupedSessions[groupKey].length}
              </Text>
            </View>
            {groupedSessions[groupKey].map((s) => (
              <SessionCardEnhanced
                key={s.id}
                session={s}
                isActive={s.id === activeSessionId}
                isEditing={editingId === s.id}
                onNavigate={() => handleNavigate(s.id)}
                onStartEdit={() => handleStartEdit(s.id)}
                onConfirmEdit={(newTitle) => handleConfirmEdit(s.id, newTitle)}
                onCancelEdit={handleCancelEdit}
                onDelete={() => handleDelete(s.id)}
              />
            ))}
          </View>
        ))}

        <BottomNav active='/pages/sessions/index' />
      </View>
    </PageTransition>
  )
}
