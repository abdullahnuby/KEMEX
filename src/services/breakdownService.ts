import { requireSupabase } from './supabase';
import type {
  BreakdownEvent,
  BreakdownEventInsert,
  BreakdownEventUpdate,
  MaintenanceTransport,
  MaintenanceTransportInsert,
  MaintenanceCostItem,
  MaintenanceCostItemInsert,
  DowntimeTracking,
  DowntimeTrackingInsert,
  BreakdownCostSummary,
  BreakdownStatus,
  CostCategory,
  TrueCostAssetRow,
} from '../types/breakdown';
import { DIRECT_COST_CATEGORIES, INDIRECT_COST_CATEGORIES } from '../types/breakdown';

function sb() {
  return requireSupabase();
}

// =====================================================================
// Breakdown Events
// =====================================================================
export const breakdownEventsService = {
  async list(filters?: {
    assetId?: string;
    status?: BreakdownStatus;
    severity?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<BreakdownEvent[]> {
    let query = sb()
      .from('breakdown_events')
      .select('*')
      .order('breakdown_datetime', { ascending: false });

    if (filters?.assetId) query = query.eq('asset_id', filters.assetId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.fromDate) query = query.gte('breakdown_datetime', filters.fromDate);
    if (filters?.toDate) query = query.lte('breakdown_datetime', filters.toDate);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<BreakdownEvent | null> {
    const { data, error } = await sb()
      .from('breakdown_events')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: BreakdownEventInsert): Promise<BreakdownEvent> {
    const { data, error } = await sb()
      .from('breakdown_events')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    // Update asset status to 'تحت الصيانة'
    if (data?.asset_id) {
      try {
        await sb().from('assets').update({ status: 'تحت الصيانة' }).eq('id', data.asset_id);
      } catch (assetErr) {
        console.warn('Failed to update asset status on breakdown create:', assetErr);
      }
    }

    return data;
  },

  async update(id: string, payload: BreakdownEventUpdate): Promise<BreakdownEvent> {
    const { data, error } = await sb()
      .from('breakdown_events')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: BreakdownStatus): Promise<BreakdownEvent> {
    return this.update(id, { status });
  },

  async close(id: string, recoveryDatetime: string): Promise<BreakdownEvent> {
    const updated = await this.update(id, {
      status: 'closed',
      recovery_datetime: recoveryDatetime,
    });

    // Revert asset status to 'متاح'
    if (updated?.asset_id) {
      try {
        await sb().from('assets').update({ status: 'متاح' }).eq('id', updated.asset_id);
      } catch (assetErr) {
        console.warn('Failed to revert asset status on breakdown close:', assetErr);
      }
    }

    return updated;
  },

  async delete(id: string): Promise<void> {
    const { error } = await sb().from('breakdown_events').delete().eq('id', id);
    if (error) throw error;
  },
};


// =====================================================================
// Transports
// =====================================================================
export const transportsService = {
  async listByBreakdown(breakdownEventId: string): Promise<MaintenanceTransport[]> {
    const { data, error } = await sb()
      .from('maintenance_transports')
      .select('*')
      .eq('breakdown_event_id', breakdownEventId)
      .order('transport_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: MaintenanceTransportInsert): Promise<MaintenanceTransport> {
    const { data, error } = await sb()
      .from('maintenance_transports')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await sb().from('maintenance_transports').delete().eq('id', id);
    if (error) throw error;
  },
};

// =====================================================================
// Cost Items
// =====================================================================
export const costItemsService = {
  async listByBreakdown(breakdownEventId: string): Promise<MaintenanceCostItem[]> {
    const { data, error } = await sb()
      .from('maintenance_cost_items')
      .select('*')
      .eq('breakdown_event_id', breakdownEventId)
      .order('cost_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: MaintenanceCostItemInsert): Promise<MaintenanceCostItem> {
    const { data, error } = await sb()
      .from('maintenance_cost_items')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    payload: Partial<MaintenanceCostItemInsert>
  ): Promise<MaintenanceCostItem> {
    const { data, error } = await sb()
      .from('maintenance_cost_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await sb().from('maintenance_cost_items').delete().eq('id', id);
    if (error) throw error;
  },
};

// =====================================================================
// Downtime
// =====================================================================
export const downtimeService = {
  async listByBreakdown(breakdownEventId: string): Promise<DowntimeTracking[]> {
    const { data, error } = await sb()
      .from('downtime_tracking')
      .select('*')
      .eq('breakdown_event_id', breakdownEventId);
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: DowntimeTrackingInsert): Promise<DowntimeTracking> {
    const { data, error } = await sb()
      .from('downtime_tracking')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async close(id: string, endDatetime: string): Promise<DowntimeTracking> {
    const { data, error } = await sb()
      .from('downtime_tracking')
      .update({ end_datetime: endDatetime })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await sb().from('downtime_tracking').delete().eq('id', id);
    if (error) throw error;
  },
};

// =====================================================================
// Cost Calculation (Client-Side Aggregation)
// =====================================================================
export function calculateBreakdownCost(
  costItems: MaintenanceCostItem[],
  transports: MaintenanceTransport[],
  downtime: DowntimeTracking[],
  breakdownEvent: BreakdownEvent
): BreakdownCostSummary {
  const summary: BreakdownCostSummary = {
    diagnosis: 0,
    outbound_transport: 0,
    spare_parts: 0,
    labor: 0,
    external_workshop: 0,
    return_transport: 0,
    per_diem: 0,
    other_direct: 0,
    total_direct: 0,
    driver_downtime: 0,
    lost_revenue: 0,
    penalty: 0,
    total_indirect: 0,
    total_full: 0,
    downtime_hours: breakdownEvent.downtime_hours ?? 0,
    days_down: 0,
  };

  // Aggregate cost items
  for (const item of costItems) {
    const cat = item.cost_category as CostCategory;
    if (DIRECT_COST_CATEGORIES.includes(cat)) {
      if (cat === 'other') summary.other_direct += item.amount;
      else summary[cat as keyof BreakdownCostSummary] += item.amount;
    } else if (INDIRECT_COST_CATEGORIES.includes(cat)) {
      summary[cat as keyof BreakdownCostSummary] += item.amount;
    }
  }

  // Add transports
  for (const t of transports) {
    if (t.direction === 'to_workshop') summary.outbound_transport += t.transport_cost;
    else if (t.direction === 'to_site') summary.return_transport += t.transport_cost;
    else summary.other_direct += t.transport_cost;
  }

  // Add downtime costs
  for (const d of downtime) {
    summary.driver_downtime += d.driver_downtime_cost;
    summary.lost_revenue += d.lost_revenue_total;
  }

  // Totals
  summary.total_direct =
    summary.diagnosis +
    summary.outbound_transport +
    summary.spare_parts +
    summary.labor +
    summary.external_workshop +
    summary.return_transport +
    summary.per_diem +
    summary.other_direct;

  summary.total_indirect =
    summary.driver_downtime + summary.lost_revenue + summary.penalty;

  summary.total_full = summary.total_direct + summary.total_indirect;

  summary.days_down = Number(((summary.downtime_hours ?? 0) / 24).toFixed(2));

  return summary;
}

// =====================================================================
// True Cost Report Service
// =====================================================================
export const trueCostService = {
  async getReport(filters?: { fromDate?: string; toDate?: string }): Promise<TrueCostAssetRow[]> {
    let q = sb().from('breakdown_events').select('*');
    if (filters?.fromDate) q = q.gte('breakdown_datetime', filters.fromDate);
    if (filters?.toDate) q = q.lte('breakdown_datetime', filters.toDate);
    const { data: breakdowns, error: bErr } = await q;
    if (bErr) throw bErr;
    if (!breakdowns || !breakdowns.length) return [];

    const breakdownIds = breakdowns.map(b => b.id);

    const [costRes, transRes, downRes, assetsRes] = await Promise.all([
      sb().from('maintenance_cost_items').select('*').in('breakdown_event_id', breakdownIds),
      sb().from('maintenance_transports').select('*').in('breakdown_event_id', breakdownIds),
      sb().from('downtime_tracking').select('*').in('breakdown_event_id', breakdownIds),
      sb().from('assets').select('id, name, code'),
    ]);

    const costItems = (costRes.data ?? []) as MaintenanceCostItem[];
    const transports = (transRes.data ?? []) as MaintenanceTransport[];
    const downtimes = (downRes.data ?? []) as DowntimeTracking[];
    const assetsList = (assetsRes.data ?? []) as Array<{ id: string; name: string; code: string }>;
    const assetsMap = new Map(assetsList.map(a => [a.id, a]));

    const assetMap = new Map<string, TrueCostAssetRow>();

    for (const b of breakdowns as BreakdownEvent[]) {
      const asset = assetsMap.get(b.asset_id);
      const assetCode = asset?.code ?? b.asset_id;
      const assetName = asset?.name ?? b.asset_id;

      const bCostItems = costItems.filter(c => c.breakdown_event_id === b.id);
      const bTransports = transports.filter(t => t.breakdown_event_id === b.id);
      const bDowntimes = downtimes.filter(d => d.breakdown_event_id === b.id);

      const summary = calculateBreakdownCost(bCostItems, bTransports, bDowntimes, b);

      const existing = assetMap.get(b.asset_id) ?? {
        asset_id: b.asset_id,
        asset_code: assetCode,
        asset_name: assetName,
        breakdown_count: 0,
        total_direct: 0,
        total_indirect: 0,
        total_full: 0,
        downtime_hours: 0,
      };

      existing.breakdown_count += 1;
      existing.total_direct += summary.total_direct;
      existing.total_indirect += summary.total_indirect;
      existing.total_full += summary.total_full;
      existing.downtime_hours += summary.downtime_hours;

      assetMap.set(b.asset_id, existing);
    }

    return Array.from(assetMap.values());
  },
};