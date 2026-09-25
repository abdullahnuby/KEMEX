import { requireSupabase } from './supabase'
import type { DataTable } from '../features/dataManagement/catalog'

export type KemexBackup = {
  format: 'kemex-db-backup'
  version: 1
  created_at: string
  schema: 'public'
  tables: Record<string, unknown[]>
}

const PAGE_SIZE = 500
const IMPORT_BATCH_SIZE = 500

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const db = requireSupabase()
  const { data, error } = await db.rpc(fn, args)
  if (error) throw error
  return data as T
}

export async function getDataCatalog(): Promise<DataTable[]> {
  return rpc<DataTable[]>('kemex_data_catalog', {})
}

export async function exportTable(table: DataTable, onProgress?: (loaded: number) => void) {
  const all: Record<string, unknown>[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await rpc<Record<string, unknown>[]>('kemex_export_table', {
      p_table_name: table.table_name,
      p_limit: PAGE_SIZE,
      p_offset: offset,
    })
    all.push(...(rows ?? []))
    onProgress?.(all.length)
    if (!rows || rows.length < PAGE_SIZE) break
  }
  return all
}

export async function exportDatabaseBackup(tables: DataTable[], onProgress?: (tableName: string, tableIndex: number, totalTables: number, rowCount: number) => void): Promise<KemexBackup> {
  const payload: KemexBackup = {
    format: 'kemex-db-backup',
    version: 1,
    created_at: new Date().toISOString(),
    schema: 'public',
    tables: {},
  }
  for (let index = 0; index < tables.length; index++) {
    const table = tables[index]
    const rows = await exportTable(table, count => onProgress?.(table.table_name, index + 1, tables.length, count))
    payload.tables[table.table_name] = rows
  }
  return payload
}

export async function importTableRows(tableName: string, rows: unknown[], mode: 'upsert' | 'insert' = 'upsert', onProgress?: (processed: number) => void) {
  let processed = 0
  for (let start = 0; start < rows.length; start += IMPORT_BATCH_SIZE) {
    const batch = rows.slice(start, start + IMPORT_BATCH_SIZE)
    await rpc('kemex_import_table', { p_table_name: tableName, p_rows: batch, p_mode: mode })
    processed += batch.length
    onProgress?.(processed)
  }
  return processed
}

export async function registerBackup(kind: 'scheduled' | 'pre_release' | 'manual' | 'restore_point', reference: string, status: 'captured' | 'verified' | 'failed' | 'restored', notes?: string) {
  return rpc<string>('kemex_register_backup', {
    p_backup_kind: kind,
    p_provider_reference: reference,
    p_status: status,
    p_notes: notes ?? null,
  })
}

export function parseBackup(value: unknown): KemexBackup {
  if (!value || typeof value !== 'object') throw new Error('ملف النسخة الاحتياطية غير صالح.')
  const backup = value as Partial<KemexBackup>
  if (backup.format !== 'kemex-db-backup' || backup.version !== 1 || backup.schema !== 'public' || !backup.tables || typeof backup.tables !== 'object') {
    throw new Error('هذا الملف ليس نسخة KEMEX صالحة أو إصداره غير مدعوم.')
  }
  return backup as KemexBackup
}
