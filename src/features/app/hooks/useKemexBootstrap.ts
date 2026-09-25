import { useMemo } from 'react'
import {
  useAssetQueries,
  useApprovalEventsQuery,
  useInventoryQueries,
  useMaintenanceQueries,
  useModuleRecordsQueries,
  useOperationsQueries,
  useProjectQueries,
  useSettingsQuery,
  useTripQueries,
} from './useKemexDomainQueries'
import type { Asset, Customer, FuelOperation, InventoryItem, MaintenancePart, MaintenanceTechnician, Project, StockMovement, Warehouse, WorkOrder } from '../../../types/tfms'
import type { Trip, TripCost } from '../../trips/types'

export interface BootstrapSettings {
  alertDays: number
  alertKm: number
  alertHours: number
  vat: number
  diesel: number
  petrol: number
  currencyCode: string
  companyName: string
  groupName: string
  tripGeofenceRadiusM: number
  printSettings: Record<string, unknown>
}

export interface KemexBootstrapData {
  assets: Asset[]
  projects: Project[]
  workOrders: WorkOrder[]
  fuelOps: FuelOperation[]
  clients: Customer[]
  costCenters: Array<{ id: string; code: string; name: string; active: boolean }>
  assetTypes: Array<{ id: string; code: string; name: string; defaultMeterType: string; standardConsumption?: number; billingUnit?: string; billingRate?: number; billingMinimum?: number; active: boolean }>
  chargingRates: Array<{ id: string; assetTypeId?: string; assetId?: string; projectId?: string; unit: string; rate: number; minimum?: number; active: boolean }>
  warehouses: Warehouse[]
  inventoryItems: InventoryItem[]
  stockMovements: StockMovement[]
  trips: Trip[]
  tripCosts: TripCost[]
  maintenanceTechnicians: MaintenanceTechnician[]
  maintenanceParts: MaintenancePart[]
  moduleData: Record<string, Record<string, unknown>[]>
  approvalEvents: Record<string, unknown>[]
  settings: BootstrapSettings
  failures: string[]
}

/**
 * Domain queries expose their own loading/error boundaries; this facade only combines them
 * into the data shape expected by the existing page layer.
 */

export function useKemexBootstrap(userId: string | undefined, activeRoute = 'dashboard') {
  const assetsQuery = useAssetQueries(userId)
  const projectsQuery = useProjectQueries(userId)
  const maintenanceQuery = useMaintenanceQueries(userId)
  const inventoryQuery = useInventoryQueries(userId)
  const operationsQuery = useOperationsQueries(userId)
  const tripsQuery = useTripQueries(userId)
  const settingsQuery = useSettingsQuery(userId)
  const modulesQuery = useModuleRecordsQueries(userId, activeRoute)
  const approvalEventsQuery = useApprovalEventsQuery(userId)

  const data = useMemo<KemexBootstrapData>(() => {
    const settingsRaw = settingsQuery.data ?? {}
    const failures = [
      assetsQuery.isError ? `الأصول: ${assetsQuery.error instanceof Error ? assetsQuery.error.message : 'تعذر تحميل البيانات'}` : '',
      projectsQuery.isError ? `المشروعات: ${projectsQuery.error instanceof Error ? projectsQuery.error.message : 'تعذر تحميل البيانات'}` : '',
      ...maintenanceQuery.failures,
      ...inventoryQuery.failures,
      ...operationsQuery.failures,
      ...tripsQuery.failures,
      settingsQuery.isError ? `الإعدادات: ${settingsQuery.error instanceof Error ? settingsQuery.error.message : 'تعذر تحميل البيانات'}` : '',
      ...modulesQuery.failures,
      approvalEventsQuery.isError ? `سجل الاعتمادات: ${approvalEventsQuery.error instanceof Error ? approvalEventsQuery.error.message : 'تعذر تحميل البيانات'}` : '',
    ].filter(Boolean)

    return {
      assets: assetsQuery.data ?? [],
      projects: projectsQuery.data ?? [],
      workOrders: maintenanceQuery.workOrders,
      maintenanceTechnicians: maintenanceQuery.technicians,
      maintenanceParts: maintenanceQuery.parts,
      warehouses: inventoryQuery.warehouses,
      inventoryItems: inventoryQuery.items,
      stockMovements: inventoryQuery.movements,
      fuelOps: operationsQuery.fuelOps,
      clients: operationsQuery.clients,
      costCenters: operationsQuery.costCenters,
      assetTypes: operationsQuery.assetTypes,
      chargingRates: operationsQuery.chargingRates,
      trips: tripsQuery.trips,
      tripCosts: tripsQuery.tripCosts,
      moduleData: modulesQuery.data,
      approvalEvents: approvalEventsQuery.data ?? [],
      settings: {
        alertDays: Number(settingsRaw.alert_days ?? 30),
        alertKm: Number(settingsRaw.alert_km ?? 1500),
        alertHours: Number(settingsRaw.alert_hours ?? 80),
        currencyCode: String(settingsRaw.currency_code ?? 'EGP'),
        companyName: String(settingsRaw.company_name ?? '').trim(),
        groupName: String(settingsRaw.group_name ?? '').trim(),
        tripGeofenceRadiusM: Number(settingsRaw.trip_geofence_radius_m ?? 1000),
        printSettings: (settingsRaw.print_settings && typeof settingsRaw.print_settings === 'object') ? settingsRaw.print_settings as Record<string, unknown> : {},
        vat: Number(settingsRaw.vat ?? 0),
        diesel: Number(settingsRaw.diesel ?? 0),
        petrol: Number(settingsRaw.petrol ?? 0),
      },
      failures,
    }
  }, [
    assetsQuery,
    projectsQuery,
    maintenanceQuery,
    inventoryQuery,
    operationsQuery,
    tripsQuery,
    settingsQuery,
    modulesQuery,
    approvalEventsQuery,
  ])

  const queries = [assetsQuery, projectsQuery, maintenanceQuery, inventoryQuery, operationsQuery, tripsQuery, settingsQuery, approvalEventsQuery]
  const isPending = queries.some(query => query.isPending) || modulesQuery.isPending
  const isFetching = queries.some(query => query.isFetching) || modulesQuery.isFetching
  const isError = data.failures.length > 0

  return {
    data,
    isPending: Boolean(userId) && isPending,
    isFetching,
    isError,
    error: isError ? new Error(data.failures.join(' | ')) : null,
  }
}
