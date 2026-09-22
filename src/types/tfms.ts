export type Role = 'admin' | 'mgmt' | 'fleet' | 'pm' | 'eng' | 'maint' | 'acct'

export type User = {
  id: string
  username: string
  name: string
  role: Role
  active?: boolean
  mustChangePassword?: boolean
  pass?: string
}

export type Project = {
  id: string
  code: string
  name: string
  client: string
  clientId?: string
  mgr: string
  site: string
  cc: string
  status: string
  start?: string
  end?: string
  contract?: string
  location?: string
  phone?: string
  budget?: number
  progress?: number
  notes?: string
}

export type Asset = {
  id: string
  code: string
  name: string
  cat: string
  type: string
  assetTypeId?: string
  own: string
  status: string
  cond: string
  mfr?: string
  model?: string
  year?: number
  fuel?: string
  mt: string
  meter: number
  std?: number
  capex?: number
  life?: number
  resid?: number
  proj?: string
  drv?: string
  cust?: string
  plate?: string
  buy?: string
  lic?: string
  ins?: string
  contract?: string
  notes?: string
}

export type Driver = {
  id: string
  code: string
  name: string
  phone?: string
  kind?: string
  licNo?: string
  licExp?: string
  cur?: string
  status?: string
  employeeNo?: string
  shift?: string
  joinDate?: string
  licType?: string
  medicalExp?: string
}

export type WorkOrder = {
  id: string
  asset: string
  proj?: string
  type: string
  desc: string
  opened: string
  prio: string
  status: string
  techs?: string
  laborCost?: number
  partsCost?: number
  vendorCost?: number
  vendor?: string
  downHrs?: number
  completed?: string
  planId?: string
  results?: string
  estimatedCost?: number
  cause?: string
  materials?: string
  warranty?: string
  approvalNotes?: string
}

export type FuelOperation = {
  id: string
  type: string
  tank?: string
  station?: string
  assetId?: string
  proj?: string
  date: string
  qty: number
  price: number
  total: number
  status: string
  meter?: number
  notes?: string
  sup?: string
  inv?: string
  tripId?: string
}

export type Contract = {
  id: string
  number: string
  lessor: string
  phone?: string
  assets: string[] | string
  start: string
  end: string
  rate: number
  unit: string
  minimum?: number
  fuelT?: string
  operT?: string
  maintT?: string
  status: string
  notes?: string
}

export type Operation = {
  id: string
  assetId: string
  proj?: string
  date: string
  hours: number
  meter: number
  shifts?: number
  drv?: string
  down?: number
  downR?: string
  notes?: string
  status: string
  ap?: string
  src?: string
}

export type Customer = {
  id: string
  name: string
  contact?: string
  phone?: string
  kind?: string
  notes?: string
  code?: string
  address?: string
  email?: string
  taxNo?: string
  paymentTerms?: string
  creditLimit?: number
  salesRep?: string
  status?: string
}


export type AssetDocumentStatus = 'سارية' | 'منتهية' | 'ملغاة' | 'معلقة'

export type AssetDocument = {
  id: string
  assetId: string
  documentType: 'license' | 'insurance' | 'registration' | 'inspection' | 'contract' | 'other'
  documentNumber?: string
  issueDate?: string
  expiryDate?: string
  status: AssetDocumentStatus
  fileName?: string
  storagePath?: string
  issuer?: string
  notes?: string
}

export type AssetFinancialSummary = {
  id: string
  code: string
  name: string
  acquisitionCost: number
  residualValue: number
  usefulLifeYears: number
  purchaseDate?: string
  annualDepreciation: number
  accumulatedDepreciation: number
  netBookValue: number
}

export type AssetCostSummary = {
  assetId: string
  assetCode: string
  assetName: string
  fuelCost30d: number
  maintenanceCost30d: number
  tireCost30d: number
  totalCost30d: number
}

export type AssetCostEntry = {
  id: string
  costDate: string
  category: 'fuel' | 'maintenance' | 'tires' | 'purchase' | 'depreciation' | 'other'
  assetId?: string
  projectId?: string
  amount: number
  quantity?: number
  unitCost?: number
  description?: string
  vendor?: string
  referenceType?: string
  referenceId?: string
  status: 'مسودة' | 'مسجلة' | 'معتمدة' | 'ملغاة'
  metadata?: Record<string, unknown>
}


export type Warehouse = {
  id: string
  code: string
  name: string
  location?: string
  managerName?: string
  active: boolean
}

export type InventoryItem = {
  id: string
  code: string
  name: string
  category: 'قطع غيار' | 'زيوت' | 'إطارات' | 'مواد' | 'أدوات' | 'أخرى'
  brand?: string
  unit: string
  barcode?: string
  warehouseId?: string
  location?: string
  minimumQty: number
  maximumQty: number
  reorderPoint: number
  leadTimeDays: number
  averageCost: number
  lastPurchaseCost: number
  currentQty: number
  openingQty: number
  active: boolean
  notes?: string
}

export type StockMovementType = 'استلام' | 'صرف' | 'مرتجع' | 'تسوية زيادة' | 'تسوية نقص'

export type StockMovement = {
  id: string
  movementNo: string
  itemId: string
  movementType: StockMovementType
  quantity: number
  movementDate: string
  unitCost: number
  warehouseId?: string
  assetId?: string
  workOrderId?: string
  projectId?: string
  referenceType?: string
  referenceId?: string
  notes?: string
  createdBy?: string
}

export type MaintenanceTechnician = {
  id: string
  code: string
  name: string
  specialty?: string
  phone?: string
  employmentType?: string
  active: boolean
  notes?: string
}

export type MaintenancePart = {
  id: string
  workOrderId: string
  itemId: string
  plannedQty: number
  issuedQty: number
  returnedQty: number
  unitCost: number
  notes?: string
}

export type AuditEntry = {
  id: string
  occurredAt: string
  userId?: string
  username: string
  action: string
  entity: string
  reference?: string
  details?: string
  source?: string
}

export type AlertItem = {
  key: string
  title: string
  entity: string
  detail: string
  severity: 'عالي' | 'متوسط' | 'منخفض'
  route: string
}

