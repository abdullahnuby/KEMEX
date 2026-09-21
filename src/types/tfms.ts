export type Role = 'admin' | 'mgmt' | 'fleet' | 'pm' | 'eng' | 'maint' | 'acct'

export type User = {
  id: string
  username: string
  name: string
  role: Role
  active?: boolean
  pass?: string
}

export type Project = {
  id: string
  code: string
  name: string
  client: string
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

export type AlertItem = {
  key: string
  title: string
  entity: string
  detail: string
  severity: 'عالي' | 'متوسط' | 'منخفض'
  route: string
}

