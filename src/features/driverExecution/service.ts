import { requireSupabase } from '../../services/supabase'
import { createAttachmentSignedUrl, deleteAttachment, listAttachments, uploadAttachment } from '../../services/attachments'
import type { DriverTrip, DriverTripEvent, DriverTripException, DriverTripReceipt, DriverProfile, DriverExceptionType, ReceiptType, GeoLocation, DriverVehicleInfo } from './types'
const db = () => requireSupabase()
async function currentAuthUserId() { const { data, error } = await db().auth.getUser(); if (error || !data.user) throw new Error('يجب تسجيل الدخول.'); return data.user.id }
export const driverExecutionService = {
  async getProfile(userId: string): Promise<DriverProfile> {
    const { data: profile, error: profileError } = await db().from('profiles').select('id,full_name,driver_id').eq('id', userId).single()
    if (profileError || !profile?.driver_id) throw new Error('حساب السائق غير مرتبط بملف سائق في النظام.')
    const { data: driver, error: driverError } = await db().from('drivers').select('*').eq('id', profile.driver_id).single()
    if (driverError || !driver) throw new Error('ملف السائق غير موجود.')
    return { id: String(profile.id), name: String(driver.name ?? profile.full_name ?? ''), code: String(driver.code ?? ''), phone: driver.phone ? String(driver.phone) : undefined, driverId: String(driver.id), vehicleId: driver.current_assignment ? String(driver.current_assignment) : null }
  },
  async listMyTrips(driverId: string): Promise<DriverTrip[]> {
    const { data, error } = await db().from('trips').select('*').eq('driver_id', driverId).order('scheduled_start', { ascending: true })
    if (error) throw error; return (data ?? []) as DriverTrip[]
  },
  async getTrip(id: string): Promise<DriverTrip> {
    const { data, error } = await db().from('trips').select('*').eq('id', id).single();
    if (error) throw error;
    const { data: vehicle, error: vehicleError } = await db().rpc('trip_vehicle_info', { p_trip_id: id });
    if (vehicleError) throw vehicleError;
    const info = Array.isArray(vehicle) ? (vehicle[0] as DriverVehicleInfo | undefined) : undefined;
    return { ...(data as DriverTrip), ...(info ? { truck_asset_code: info.truck_code, truck_asset_name: info.truck_name, truck_plate_number: info.truck_plate, trailer_asset_code: info.trailer_code, trailer_asset_name: info.trailer_name, trailer_plate_number: info.trailer_plate } : {}) } as DriverTrip
  },
  async listEvents(tripId: string): Promise<DriverTripEvent[]> { const { data, error } = await db().from('trip_execution_events').select('*').eq('trip_id', tripId).order('sequence_no', { ascending: true }); if (error) throw error; return (data ?? []) as DriverTripEvent[] },
  async listExceptions(tripId: string): Promise<DriverTripException[]> { const { data, error } = await db().from('trip_exceptions').select('*').eq('trip_id', tripId).order('occurred_at', { ascending: false }); if (error) throw error; return (data ?? []) as DriverTripException[] },
  async listReceipts(tripId: string): Promise<DriverTripReceipt[]> {
    const { data, error } = await db().from('trip_receipts').select('*').eq('trip_id', tripId).order('uploaded_at', { ascending: true }); if (error) throw error
    const rows = (data ?? []) as DriverTripReceipt[]; const attachments = await listAttachments('trip_receipt', tripId); const byId = new Map(attachments.map(x => [x.id, x]))
    return Promise.all(rows.map(async row => { const attachment = byId.get(row.attachment_id); let preview_url: string | undefined; if (attachment?.storagePath) { try { preview_url = await createAttachmentSignedUrl(attachment.storagePath) } catch { preview_url = undefined } } return { ...row, file_name: attachment?.fileName, storage_path: attachment?.storagePath, content_type: attachment?.contentType, preview_url } }))
  },
  async uploadReceipt(tripId: string, receiptType: ReceiptType, file: File, location?: GeoLocation): Promise<DriverTripReceipt> {
    const userId = await currentAuthUserId(); const attachment = await uploadAttachment({ entityType: 'trip_receipt', entityId: tripId, file })
    try {
      const { data, error } = await db().from('trip_receipts').insert({ trip_id: tripId, receipt_type: receiptType, attachment_id: attachment.id, uploaded_by: userId, latitude: location?.latitude ?? null, longitude: location?.longitude ?? null }).select('*').single()
      if (error) throw error; let preview_url: string | undefined; if (attachment.contentType?.startsWith('image/')) { try { preview_url = await createAttachmentSignedUrl(attachment.storagePath) } catch { preview_url = undefined } } return { ...(data as DriverTripReceipt), file_name: attachment.fileName, storage_path: attachment.storagePath, content_type: attachment.contentType, preview_url }
    } catch (error) { await deleteAttachment(attachment.id, attachment.storagePath).catch(() => undefined); throw error }
  },
  async uploadExceptionEvidence(tripId: string, file: File) {
    return uploadAttachment({ entityType: 'trip_exception', entityId: tripId, file })
  },
  async transition(tripId: string, toStatus: string, location?: GeoLocation, receiptId?: string): Promise<DriverTrip> {
    const { data, error } = await db().rpc('driver_trip_transition', { p_trip_id: tripId, p_to_status: toStatus, p_latitude: location?.latitude ?? null, p_longitude: location?.longitude ?? null, p_receipt_id: receiptId ?? null })
    if (error) throw error; return data as DriverTrip
  },
  async reportException(tripId: string, input: { exceptionType: DriverExceptionType; category?: string; reason?: string; notes?: string; location?: GeoLocation; attachmentIds?: string[] }): Promise<DriverTripException> {
    const { data, error } = await db().rpc('driver_report_trip_exception', { p_trip_id: tripId, p_exception_type: input.exceptionType, p_category: input.category ?? null, p_reason: input.reason ?? null, p_notes: input.notes ?? null, p_latitude: input.location?.latitude ?? null, p_longitude: input.location?.longitude ?? null, p_attachment_ids: input.attachmentIds ?? [] })
    if (error) throw error; return data as DriverTripException
  },
  async clearException(tripId: string, notes?: string) { const { data, error } = await db().rpc('driver_clear_exception', { p_trip_id: tripId, p_notes: notes ?? null }); if (error) throw error; return data as DriverTrip },
  async listNotifications(userId: string) { const { data, error } = await db().from('notification_outbox').select('*').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(25); if (error) throw error; return data ?? [] },
  async markNotificationRead(id: string) { const { error } = await db().from('notification_outbox').update({ read_at: new Date().toISOString() }).eq('id', id); if (error) throw error },
}
