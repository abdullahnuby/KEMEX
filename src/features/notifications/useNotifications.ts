import { useCallback, useEffect, useState } from 'react'
import { notificationsService } from './service'
import type { AppNotification } from './types'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async (silent = false) => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    if (!silent) setLoading(true)
    setError('')
    try {
      const [items, unread] = await Promise.all([
        notificationsService.list(userId),
        notificationsService.countUnread(userId),
      ])
      setNotifications(items)
      setUnreadCount(unread)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل التنبيهات.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
    if (!userId) return

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
    await notificationsService.markRead(id)
    setNotifications(current => current.map(item =>
      item.id === id && !item.read_at
        ? { ...item, read_at: new Date().toISOString() }
        : item,
    ))
    setUnreadCount(current => Math.max(0, current - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return
    await notificationsService.markAllRead(userId)
    setNotifications(current => current.map(item => ({
      ...item,
      read_at: item.read_at ?? new Date().toISOString(),
    })))
    setUnreadCount(0)
  }, [unreadCount, userId])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  }
}
