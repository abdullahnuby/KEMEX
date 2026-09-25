import { useCallback, useEffect, useState } from 'react'
import { notificationService } from './service'
import type { AppNotification } from './types'

export function useNotificationCenter(userId: string | undefined) {
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')

  const refresh = useCallback(async (silent = false) => {
    if (!userId) {
      setItems([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    if (!silent) setLoading(true)
    try {
      const [list, unread] = await Promise.all([
        notificationService.list(userId),
        notificationService.countUnread(userId),
      ])
      setItems(list)
      setUnreadCount(unread)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل التنبيهات.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
    if (!userId) return undefined

    const timer = window.setInterval(() => {
      void refresh(true)
    }, 20_000)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh(true)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh, userId])

  const markRead = useCallback(async (id: string) => {
    if (!userId) return
    await notificationService.markRead(id)
    setItems(current => current.map(item => item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
    setUnreadCount(current => Math.max(0, current - 1))
  }, [userId])

  const markAllRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return
    await notificationService.markAllRead(userId)
    const now = new Date().toISOString()
    setItems(current => current.map(item => item.read_at == null ? { ...item, read_at: now } : item))
    setUnreadCount(0)
  }, [unreadCount, userId])

  return {
    items,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  }
}
