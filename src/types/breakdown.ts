// =====================================================================
// Breakdown & Full Cost Management - Types
// =====================================================================

export type BreakdownSeverity = 'minor' | 'major' | 'critical';

export type BreakdownStatus =
  | 'reported'
  | 'inspecting'
  | 'awaiting_transport'
  | 'in_transit_to_workshop'
  | 'under_repair'
  | 'awaiting_return'
  | 'in_transit_to_site'
  | 'delivered'
  | 'closed';

export type TransportDirection = 'to_workshop' | 'to_site' | 'internal';

export type TransportType =
  | 'tow_truck'
  | 'trailer'
  | 'crane'
  | 'flatbed'
  | 'other';

export type CostCategory =
  | 'diagnosis'
  | 'outbound_transport'
  | 'spare_parts'
  | 'labor'
  | 'external_workshop'
  | 'return_transport'
  | 'driver_downtime'
  | 'lost_revenue'
  | 'penalty'
  | 'per_diem'
  | 'other';

// ---------------------------------------------------------------------
// Breakdown Event
// ---------------------------------------------------------------------
export interface BreakdownEvent {
  id: string;
  asset_id: string;
  project_id: string | null;
  driver_id: string | null;
  work_order_id: string | null;
  reported_at: string;
  breakdown_datetime: string;
  location: string | null;
  description: string;
  severity: BreakdownSeverity;
  status: BreakdownStatus;
  recovery_datetime: string | null;
  downtime_hours: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BreakdownEventInsert = Omit<
  BreakdownEvent,
  'id' | 'created_at' | 'updated_at' | 'downtime_hours' | 'reported_at'
> & {
  reported_at?: string;
};

export type BreakdownEventUpdate = Partial<BreakdownEventInsert>;

// ---------------------------------------------------------------------
// Maintenance Transport
// ---------------------------------------------------------------------
export interface MaintenanceTransport {
  id: string;
  breakdown_event_id: string | null;
  work_order_id: string | null;
  direction: TransportDirection;
  transport_type: TransportType;
  from_location: string | null;
  to_location: string | null;
  transport_date: string;
  transport_cost: number;
  vendor_name: string | null;
  driver_name: string | null;
  plate_number: string | null;
  notes: string | null;
  created_at: string;
}

export type MaintenanceTransportInsert = Omit<
  MaintenanceTransport,
  'id' | 'created_at'
>;

// ---------------------------------------------------------------------
// Maintenance Cost Item
// ---------------------------------------------------------------------
export interface MaintenanceCostItem {
  id: string;
  breakdown_event_id: string | null;
  work_order_id: string | null;
  cost_category: CostCategory;
  description: string;
  amount: number;
  currency: string;
  vendor_name: string | null;
  invoice_number: string | null;
  cost_date: string;
  is_billable: boolean;
  billed_to_client_id: string | null;
  attachments?: unknown;
  created_at: string;
}

export type MaintenanceCostItemInsert = Omit<
  MaintenanceCostItem,
  'id' | 'created_at' | 'attachments'
> & {
  attachments?: unknown;
};

// ---------------------------------------------------------------------
// Downtime Tracking
// ---------------------------------------------------------------------
export interface DowntimeTracking {
  id: string;
  breakdown_event_id: string | null;
  asset_id: string;
  driver_id: string | null;
  start_datetime: string;
  end_datetime: string | null;
  duration_hours: number | null;
  driver_daily_rate: number;
  driver_downtime_cost: number;
  lost_revenue_per_day: number;
  lost_revenue_total: number;
  notes: string | null;
  created_at: string;
}

export type DowntimeTrackingInsert = Omit<
  DowntimeTracking,
  'id' | 'created_at' | 'duration_hours' | 'driver_downtime_cost' | 'lost_revenue_total'
> & {
  driver_daily_rate?: number;
  driver_downtime_cost?: number;
  lost_revenue_per_day?: number;
  lost_revenue_total?: number;
};

export interface TrueCostAssetRow {
  asset_id: string;
  asset_code: string;
  asset_name: string;
  breakdown_count: number;
  total_direct: number;
  total_indirect: number;
  total_full: number;
  downtime_hours: number;
}


// ---------------------------------------------------------------------
// Cost Summary (Computed)
// ---------------------------------------------------------------------
export interface BreakdownCostSummary {
  // Direct costs
  diagnosis: number;
  outbound_transport: number;
  spare_parts: number;
  labor: number;
  external_workshop: number;
  return_transport: number;
  per_diem: number;
  other_direct: number;
  total_direct: number;

  // Indirect costs
  driver_downtime: number;
  lost_revenue: number;
  penalty: number;
  total_indirect: number;

  // Grand total
  total_full: number;

  // Meta
  downtime_hours: number;
  days_down: number;
}

// ---------------------------------------------------------------------
// Status Labels (Arabic)
// ---------------------------------------------------------------------
export const BREAKDOWN_STATUS_LABELS: Record<BreakdownStatus, string> = {
  reported: 'تم الإبلاغ',
  inspecting: 'قيد الفحص',
  awaiting_transport: 'بانتظار النقل',
  in_transit_to_workshop: 'في الطريق للورشة',
  under_repair: 'قيد الإصلاح',
  awaiting_return: 'بانتظار العودة',
  in_transit_to_site: 'في الطريق للموقع',
  delivered: 'تم التسليم',
  closed: 'مغلق',
};

export const SEVERITY_LABELS: Record<BreakdownSeverity, string> = {
  minor: 'بسيط',
  major: 'جسيم',
  critical: 'حرج',
};

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  diagnosis: 'كشف وتشخيص',
  outbound_transport: 'نقل للورشة',
  spare_parts: 'قطع غيار',
  labor: 'مصنعيات',
  external_workshop: 'ورشة خارجية',
  return_transport: 'نقل عودة',
  driver_downtime: 'بدل توقف سائق',
  lost_revenue: 'خسارة إيراد',
  penalty: 'غرامة تأخير',
  per_diem: 'بدلات',
  other: 'أخرى',
};

export const TRANSPORT_TYPE_LABELS: Record<TransportType, string> = {
  tow_truck: 'ونش',
  trailer: 'تريلا',
  crane: 'أوناش رفع',
  flatbed: 'شاحنة نقل',
  other: 'أخرى',
};

export const DIRECT_COST_CATEGORIES: CostCategory[] = [
  'diagnosis',
  'outbound_transport',
  'spare_parts',
  'labor',
  'external_workshop',
  'return_transport',
  'per_diem',
  'other',
];

export const INDIRECT_COST_CATEGORIES: CostCategory[] = [
  'driver_downtime',
  'lost_revenue',
  'penalty',
];

// Status transitions (allowed next statuses)
export const STATUS_TRANSITIONS: Record<BreakdownStatus, BreakdownStatus[]> = {
  reported: ['inspecting', 'closed'],
  inspecting: ['awaiting_transport', 'under_repair', 'closed'],
  awaiting_transport: ['in_transit_to_workshop', 'under_repair'],
  in_transit_to_workshop: ['under_repair'],
  under_repair: ['awaiting_return', 'delivered'],
  awaiting_return: ['in_transit_to_site'],
  in_transit_to_site: ['delivered'],
  delivered: ['closed'],
  closed: [],
};