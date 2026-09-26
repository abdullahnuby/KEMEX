import { requireSupabase } from './supabase'

export type PlatformPlan = 'trial' | 'standard' | 'enterprise'

export type PlatformTenant = {
  id: string
  slug: string
  name: string
  plan: PlatformPlan
  active: boolean
  createdAt: string
  updatedAt: string
  userCount: number
  adminCount: number
  firstAdmin: { id: string; name: string; email: string; active: boolean } | null
}

export type CreatePlatformTenantInput = {
  company_name: string
  slug: string
  plan: PlatformPlan
  admin_name: string
  admin_email: string
  initial_password: string
}

function extractFunctionError(error: unknown) {
  if (!error || typeof error !== 'object') return ''
  const context = (error as { context?: unknown }).context
  if (context && typeof context === 'object' && 'json' in context && typeof (context as { json?: unknown }).json === 'function') {
    return (context as { json: () => Promise<{ error?: string; message?: string }> }).json()
      .then(payload => String(payload?.error ?? payload?.message ?? ''))
      .catch(() => '')
  }
  return Promise.resolve(error instanceof Error ? error.message : '')
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const db = requireSupabase()
  const { data, error } = await db.functions.invoke('platform-admin', { body })
  if (error) {
    const detail = await extractFunctionError(error)
    throw new Error(detail || 'تعذر تنفيذ عملية إدارة الشركات.')
  }
  return data as T
}

function mapTenant(row: Record<string, unknown>): PlatformTenant {
  const admin = row.first_admin && typeof row.first_admin === 'object'
    ? row.first_admin as Record<string, unknown>
    : null
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    plan: String(row.plan) as PlatformPlan,
    active: row.active !== false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    userCount: Number(row.user_count ?? 0),
    adminCount: Number(row.admin_count ?? 0),
    firstAdmin: admin
      ? {
        id: String(admin.id),
        name: String(admin.name ?? ''),
        email: String(admin.email ?? ''),
        active: admin.active !== false,
      }
      : null,
  }
}


export async function listPlatformTenants(): Promise<PlatformTenant[]> {
  const result = await invoke<{ tenants: Record<string, unknown>[] }>({ action: 'list' })
  return (result.tenants ?? []).map(mapTenant)
}

export async function createPlatformTenant(input: CreatePlatformTenantInput): Promise<PlatformTenant> {
  const result = await invoke<{ tenant: Record<string, unknown> }>({ action: 'create', ...input })
  return mapTenant(result.tenant)
}
