import { createClient } from '@supabase/supabase-js'

// KEMEX production backend. Environment variables may override these defaults.
const DEFAULT_SUPABASE_URL = 'https://egwkfvpgygzgkusympxk.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_K7XYCwns_ho1xczecG4_bw_M12rI4ck'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_SUPABASE_URL
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() || DEFAULT_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigured = Boolean(url && key)
export const supabase = supabaseConfigured ? createClient(url, key) : null

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تأكد من إعداد VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY.')
  return supabase
}
