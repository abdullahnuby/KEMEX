import { requireSupabase } from '../../services/supabase'
import type { GpsAsset, GpsDevice, GpsPosition } from './types'

const db = () => requireSupabase()

export const gpsTrackingService = {
  async listAssets(): Promise<GpsAsset[]> {
    const { data, error } = await db()
      .from('assets')
      .select('id,code,name,plate_number,status,asset_type,category')
      .order('name', { ascending: true })

    if (error) throw error
    return (data ?? []) as GpsAsset[]
  },

  async listLatestPositions(): Promise<GpsPosition[]> {
    const { data, error } = await db()
      .from('vehicle_latest_gps_positions')
      .select('*')
      .order('recorded_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as GpsPosition[]
  },

  async listDevices(): Promise<GpsDevice[]> {
    const { data, error } = await db()
      .from('vehicle_gps_devices')
      .select('*')
      .order('active', { ascending: false })
      .order('asset_id', { ascending: true })

    if (error) throw error
    return (data ?? []) as GpsDevice[]
  },

  async registerDevice(input: {
    asset_id: string
    provider: string
    external_device_id: string
    label?: string
  }): Promise<GpsDevice> {
    const { data, error } = await db()
      .from('vehicle_gps_devices')
      .insert({
        asset_id: input.asset_id,
        provider: input.provider.trim() || 'generic',
        external_device_id: input.external_device_id.trim(),
        label: input.label?.trim() || null,
        active: true,
      })
      .select('*')
      .single()

    if (error) throw error
    return data as GpsDevice
  },

  async setDeviceActive(id: string, active: boolean): Promise<void> {
    const { error } = await db()
      .from('vehicle_gps_devices')
      .update({ active })
      .eq('id', id)

    if (error) throw error
  },

  async listTrack(assetId: string, hours = 24): Promise<GpsPosition[]> {
    const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await db()
      .from('vehicle_gps_positions')
      .select(
        'id,device_id,asset_id,driver_id,trip_id,latitude,longitude,speed_kmh,heading_degrees,accuracy_m,ignition_on,recorded_at,source,provider,external_device_id,metadata,created_at',
      )
      .eq('asset_id', assetId)
      .gte('recorded_at', from)
      .order('recorded_at', { ascending: true })
      .limit(2000)

    if (error) throw error
    return (data ?? []) as GpsPosition[]
  },

  subscribeToPositions(onInsert: (position: GpsPosition) => void) {
    const channel = db()
      .channel('kemex-gps-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_gps_positions',
        },
        payload => onInsert(payload.new as GpsPosition),
      )
      .subscribe()

    return () => {
      void db().removeChannel(channel)
    }
  },
}
