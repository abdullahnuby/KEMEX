export type AppNotification = {
  id: string
  recipient_id: string
  event_type: string
  title: string
  body: string
  link: string | null
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}
