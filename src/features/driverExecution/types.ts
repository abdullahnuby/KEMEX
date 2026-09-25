import type { Trip } from '../trips/types'

export type DriverExecutionStatus = 'assigned' | 'to_pickup' | 'arrived_pickup' | 'pickup_confirmed' | 'in_transit' | 'arrived_delivery' | 'delivered' | 'completed'
export type DriverExceptionType = 'BREAKDOWN' | 'EMERGENCY' | 'PICKUP_PROBLEM' | 'DELIVERY_PROBLEM' | 'LOCATION_NOT_FOUND' | 'LOCATION_CLOSED' | 'CARGO_NOT_READY' | 'QUANTITY_MISMATCH' | 'ADDRESS_PROBLEM' | 'CUSTOMER_NOT_AVAILABLE' | 'CUSTOMER_REFUSED_DELIVERY' | 'DOCUMENT_PROBLEM' | 'CARGO_DAMAGE' | 'ROAD_PROBLEM' | 'GPS_PROBLEM' | 'OTHER'
export type ReceiptType = 'PICKUP_RECEIPT' | 'DELIVERY_RECEIPT'
export type GeoLocation = { latitude: number; longitude: number; accuracy?: number }

export type DriverTripEvent = {
  id: string; sequence_no: number; trip_id: string; event_type: string; from_status: string | null; to_status: string | null; actor_user_id: string | null;
  driver_id: string | null; vehicle_id: string | null; occurred_at: string; latitude: number | null; longitude: number | null;
  distance_meters: number | null; metadata: Record<string, unknown>; document_id: string | null; notes: string | null
}
export type DriverTripReceipt = {
  id: string; sequence_no: number; trip_id: string; receipt_type: ReceiptType; attachment_id: string; uploaded_by: string; uploaded_at: string;
  latitude: number | null; longitude: number | null; distance_meters: number | null; file_name?: string; storage_path?: string; content_type?: string; preview_url?: string
}
export type DriverTripException = {
  id: string; sequence_no: number; trip_id: string; exception_type: DriverExceptionType; category: string | null; reason: string | null; notes: string | null;
  priority: 'normal' | 'high' | 'critical'; status: 'reported' | 'in_progress' | 'resolved' | 'closed'; reported_by: string;
  driver_id: string | null; vehicle_id: string | null; occurred_at: string; resolved_at: string | null; resolved_by: string | null;
  linked_attachment_ids: string[] | Record<string, unknown>; latitude: number | null; longitude: number | null
}
export type DriverProfile = { id: string; name: string; code: string; phone?: string; driverId: string; vehicleId?: string | null }
export type DriverVehicleInfo = { trip_id: string; truck_id: string | null; truck_code: string | null; truck_name: string | null; truck_plate: string | null; trailer_id: string | null; trailer_code: string | null; trailer_name: string | null; trailer_plate: string | null }
export type DriverTrip = Trip & {
  execution_status: DriverExecutionStatus | null; exception_status: DriverExceptionType | null; reference_number: string | null;
  priority: 'low' | 'normal' | 'high' | 'critical'; operational_instructions: string | null;
  pickup_instructions: string | null; delivery_instructions: string | null; pickup_latitude: number | null; pickup_longitude: number | null;
  delivery_latitude: number | null; delivery_longitude: number | null
}
