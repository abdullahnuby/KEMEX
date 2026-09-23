import { requireSupabase } from './supabase'

const BUCKET = 'kemex-attachments'

export type AttachmentMeta = {
  id: string
  entityType: string
  entityId: string
  fileName: string
  storagePath: string
  contentType?: string
  byteSize?: number
  checksum?: string
  uploadedBy?: string
  createdAt: string
  deletedAt?: string
}

function mapAttachment(row: Record<string, unknown>): AttachmentMeta {
  return {
    id: String(row.id), entityType: String(row.entity_type), entityId: String(row.entity_id), fileName: String(row.file_name),
    storagePath: String(row.storage_path), contentType: row.content_type == null ? undefined : String(row.content_type),
    byteSize: row.byte_size == null ? undefined : Number(row.byte_size), checksum: row.checksum == null ? undefined : String(row.checksum),
    uploadedBy: row.uploaded_by == null ? undefined : String(row.uploaded_by), createdAt: String(row.created_at), deletedAt: row.deleted_at == null ? undefined : String(row.deleted_at),
  }
}

export async function uploadAttachment(input: { entityType: string; entityId: string; file: File }) {
  const db = requireSupabase()
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${input.entityType}/${input.entityId}/${crypto.randomUUID()}-${safeName}`
  const { data: auth } = await db.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('يجب تسجيل الدخول قبل رفع المرفق.')
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, input.file, { upsert: false, contentType: input.file.type || undefined })
  if (uploadError) throw uploadError
  const { data, error } = await db.from('attachment_metadata').insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    file_name: input.file.name,
    storage_path: path,
    content_type: input.file.type || null,
    byte_size: input.file.size,
    uploaded_by: userId,
  }).select('*').single()
  if (error) {
    await db.storage.from(BUCKET).remove([path])
    throw error
  }
  return mapAttachment(data)
}

export async function listAttachments(entityType: string, entityId: string) {
  const db = requireSupabase()
  const { data, error } = await db.from('attachment_metadata').select('*').eq('entity_type', entityType).eq('entity_id', entityId).is('deleted_at', null).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapAttachment)
}

export async function deleteAttachment(id: string, storagePath: string) {
  const db = requireSupabase()
  const { error: storageError } = await db.storage.from(BUCKET).remove([storagePath])
  if (storageError) throw storageError
  const { error } = await db.from('attachment_metadata').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
