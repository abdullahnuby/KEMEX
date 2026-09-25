import { requireSupabase } from '../../services/supabase'
import type { AppNotification } from './types'

const db = () => requireSupabase()

export const notificationsService = {
  async list(userId: string, limit = 40): Promise<AppNotification[]> {
    const { data, error } = await db()
      .from('notification_outbox')
      .select('id,recipient_id,event_type,title,body,link,payload,read_at,created_at')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data ?? []) as AppNotification[]
  },

  async countUnread(userId: string): Promise<number> {
    const { count, error } = await db()
      .from('notification_outbox')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null)

    if (error) throw error
    return count ?? 0
  },

  async markRead(id: string): Promise<void> {
    const { error } = await db()
      .from('notification_outbox')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  async markAllRead(userId: string): Promise<void> {
    const { error } = await db()
      .from('notification_outbox')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .is('read_at', null)

    if (error) throw error
  },
}


// Backward-compatible alias used by the notification center hook.
export const notificationService = notificationsService
