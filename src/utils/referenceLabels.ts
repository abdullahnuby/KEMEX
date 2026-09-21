import type { Asset, Driver, Project, WorkOrder } from '../types/tfms'

export type ReferenceLookups = {
  assets?: Asset[]
  projects?: Project[]
  drivers?: Driver[]
  workOrders?: WorkOrder[]
  records?: Record<string, Record<string, unknown>[]>
}

type RefResult = { label: string; code?: string }

function keyOf(key: string) {
  return key.trim().toLowerCase().replace(/[-\s]/g, '')
}
function tokenOf(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}
function matchesRef(entity: Record<string, unknown> | undefined, value: string) {
  if (!entity) return false
  const needle = tokenOf(value)
  if (!needle) return false
  return [entity.id, entity.code, entity.number, entity.ref, entity.reference].some(v => tokenOf(v) === needle)
}

const groups = {
  asset: new Set(['asset','assets','assetid','asset_id','assetId','assetcode','asset_code','assetref','asset_ref','assetno','asset_no','vehicle','vehicleid','vehicle_id','vehicle_no','veh','vehid','vehcode','vehicle_id','vehiclecode','vehicle_code','veh','vehid','vehcode','equipment','equipmentid','equipment_id','equipmentcode','equipment_code','machine','machineid','machine_id','machinecode','machine_code','truck','truckid','truck_id','refasset','referenceasset','targetasset','linkedasset']),
  project: new Set(['proj','project','projects','projectid','project_id','projectId','projectcode','project_code','projectref','project_ref','projectno','project_no','projid','proj_id','projcode','proj_code','siteproject','projectrefid','projecttarget','linkedproject']),
  driver: new Set(['drv','driver','driverid','driver_id','drivercode','driver_code','operator','operatorid','operator_id']),
  workOrder: new Set(['wo','workorder','workorders','workorderid','work_order','work_order_id','workorderno','work_order_no','workref','workrefid']),
  request: new Set(['request','requests','requestid','request_id','requestno','request_no','req','reqid','req_id']),
  customer: new Set(['customer','customers','customerid','customer_id','cust','custid','cust_id','client','clientid','client_id']),
  contract: new Set(['contract','contracts','contractid','contract_id','contractno','contract_no']),
  item: new Set(['item','items','itemid','item_id','sparepart','spareparts','sparepartid','part','partid','part_id','material','materialid']),
  tire: new Set(['tire','tires','tireid','tire_id']),
}

function inGroup(key: string, group: Set<string>) { return group.has(keyOf(key)) }
function codeName(code: unknown, name: unknown): RefResult {
  const c = String(code ?? '').trim()
  const n = String(name ?? '').trim()
  return n ? { label: n, code: c || undefined } : { label: c || '—' }
}

function resolveFromRecords(key: string, value: string, lookups: ReferenceLookups): RefResult | null {
  const records = lookups.records ?? {}
  if (inGroup(key, groups.request)) {
    const item = records.requests?.find(x => String(x.id ?? '') === value || String(x.number ?? '') === value)
    return item ? { label: String(item.desc ?? item.number ?? item.id ?? '—'), code: String(item.number ?? item.id ?? '') } : null
  }
  if (inGroup(key, groups.customer)) {
    const item = records.customers?.find(x => String(x.id ?? '') === value || String(x.code ?? '') === value)
    return item ? codeName(item.code, item.name) : null
  }
  if (inGroup(key, groups.contract)) {
    const item = records.contracts?.find(x => String(x.id ?? '') === value || String(x.number ?? '') === value)
    return item ? { label: String(item.lessor ?? item.number ?? item.id ?? '—'), code: String(item.number ?? item.id ?? '') } : null
  }
  if (inGroup(key, groups.item)) {
    const item = records.inventory?.find(x => String(x.id ?? '') === value || String(x.code ?? '') === value)
    return item ? codeName(item.code, item.name) : null
  }
  if (inGroup(key, groups.tire)) {
    const item = records.tires?.find(x => String(x.id ?? '') === value || String(x.code ?? '') === value)
    return item ? { label: String(item.brand ?? item.size ?? item.code ?? item.id ?? '—'), code: String(item.code ?? item.id ?? '') } : null
  }
  return null
}

function resolveOne(key: string, raw: unknown, lookups: ReferenceLookups): RefResult | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const value = String(obj.id ?? obj.code ?? obj.number ?? obj.ref ?? obj.reference ?? '').trim()
    if (value) {
      const resolved = resolveOne(key, value, lookups)
      if (resolved) return resolved
    }
    const objectLabel = String(obj.name ?? obj.title ?? obj.desc ?? obj.description ?? '').trim()
    if (objectLabel) return { label: objectLabel, code: String(obj.code ?? obj.number ?? '').trim() || undefined }
    return null
  }
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const value = String(raw).trim()

  if (inGroup(key, groups.asset)) {
    const item = lookups.assets?.find(x => matchesRef(x as unknown as Record<string,unknown>, value))
    return item ? codeName(item.code, item.name) : null
  }
  if (inGroup(key, groups.project)) {
    const item = lookups.projects?.find(x => matchesRef(x as unknown as Record<string,unknown>, value))
    return item ? codeName(item.code, item.name) : null
  }
  if (inGroup(key, groups.driver)) {
    const item = lookups.drivers?.find(x => matchesRef(x as unknown as Record<string,unknown>, value))
    return item ? codeName(item.code, item.name) : null
  }
  if (inGroup(key, groups.workOrder)) {
    const item = lookups.workOrders?.find(x => matchesRef(x as unknown as Record<string,unknown>, value))
    return item ? { label: item.desc || item.type || item.id, code: item.id } : null
  }

  // Some legacy rows store multiple references as a comma-separated string.
  // Resolve each token when the field is a known reference family so IDs never
  // leak into the UI just because the storage shape differs.
  if ((inGroup(key, groups.asset) || inGroup(key, groups.project) || inGroup(key, groups.driver) || inGroup(key, groups.workOrder)) && value.includes(',')) {
    const resolvedParts = value.split(',').map(v => v.trim()).filter(Boolean).flatMap(part => resolveOne(key, part, lookups) ?? [])
    if (resolvedParts.length) return { label: resolvedParts.map(x => x.label).join('، '), code: resolvedParts.map(x => x.code).filter(Boolean).join('، ') || undefined }
  }

  const recordResolved = resolveFromRecords(key, value, lookups)
  if (recordResolved) return recordResolved

  // Last-resort resolver: some legacy/seed records use ambiguous field names (e.g. `ref`, `link`, `target`).
  // When the exact value matches a known reference, show the human-readable label instead of leaking the raw id/code.
  const asset = lookups.assets?.find(x => matchesRef(x as unknown as Record<string,unknown>, value))
  if (asset) return codeName(asset.code, asset.name)
  const project = lookups.projects?.find(x => matchesRef(x as unknown as Record<string,unknown>, value))
  if (project) return codeName(project.code, project.name)
  const driver = lookups.drivers?.find(x => matchesRef(x as unknown as Record<string,unknown>, value))
  if (driver) return codeName(driver.code, driver.name)
  const workOrder = lookups.workOrders?.find(x => matchesRef(x as unknown as Record<string,unknown>, value))
  if (workOrder) return { label: workOrder.desc || workOrder.type || workOrder.id, code: workOrder.id }
  for (const [kind, rows] of Object.entries(lookups.records ?? {})) {
    const item = rows.find(x => matchesRef(x, value))
    if (!item) continue
    if (kind === 'customers') return codeName(item.code, item.name)
    if (kind === 'contracts') return { label: String(item.lessor ?? item.number ?? item.id ?? '—'), code: String(item.number ?? item.id ?? '') }
    if (kind === 'inventory') return codeName(item.code, item.name)
    if (kind === 'tires') return { label: String(item.brand ?? item.size ?? item.code ?? item.id ?? '—'), code: String(item.code ?? item.id ?? '') }
    if (kind === 'requests') return { label: String(item.desc ?? item.number ?? item.id ?? '—'), code: String(item.number ?? item.id ?? '') }
  }
  return null
}

export function resolveReference(key: string, value: unknown, lookups: ReferenceLookups): RefResult[] {
  if (Array.isArray(value)) return value.flatMap(v => resolveOne(key, v, lookups) ?? [{ label: String(v ?? '—') }])
  const resolved = resolveOne(key, value, lookups)
  return resolved ? [resolved] : [{ label: String(value ?? '—') }]
}

export function displayReference(key: string, value: unknown, lookups: ReferenceLookups) {
  const results = resolveReference(key, value, lookups)
  return results.map(r => r.code && r.label !== r.code ? `${r.label} (${r.code})` : r.label).join('، ')
}

export function referenceOptions(key: string, lookups: ReferenceLookups) {
  const normalized = keyOf(key)
  if (inGroup(normalized, groups.asset)) return (lookups.assets ?? []).map(x => ({ value: x.id, label: `${x.name} — ${x.code}` }))
  if (inGroup(normalized, groups.project)) return (lookups.projects ?? []).map(x => ({ value: x.id, label: `${x.name} — ${x.code}` }))
  if (inGroup(normalized, groups.driver)) return (lookups.drivers ?? []).map(x => ({ value: x.id, label: `${x.name} — ${x.code}` }))
  if (inGroup(normalized, groups.workOrder)) return (lookups.workOrders ?? []).map(x => ({ value: x.id, label: `${x.desc || x.type || 'أمر عمل'} — ${x.id}` }))
  if (inGroup(normalized, groups.request)) return (lookups.records?.requests ?? []).map(x => ({ value: String(x.id), label: `${x.desc ?? x.number ?? x.id} — ${x.number ?? x.id}` }))
  if (inGroup(normalized, groups.customer)) return (lookups.records?.customers ?? []).map(x => ({ value: String(x.id), label: String(x.name ?? x.id) }))
  if (inGroup(normalized, groups.contract)) return (lookups.records?.contracts ?? []).map(x => ({ value: String(x.id), label: `${x.lessor ?? x.number ?? x.id} — ${x.number ?? x.id}` }))
  if (inGroup(normalized, groups.item)) return (lookups.records?.inventory ?? []).map(x => ({ value: String(x.id), label: `${x.name ?? x.code ?? x.id} — ${x.code ?? x.id}` }))
  if (inGroup(normalized, groups.tire)) return (lookups.records?.tires ?? []).map(x => ({ value: String(x.id), label: `${x.brand ?? x.size ?? x.code ?? x.id} — ${x.code ?? x.id}` }))
  return []
}

export function sameReference(raw: unknown, entity?: { id?: unknown; code?: unknown }) {
  if (raw === null || raw === undefined || !entity) return false
  const value = tokenOf(raw)
  return value === tokenOf(entity.id) || value === tokenOf(entity.code)
}
