import { useQueries, useQuery } from '@tanstack/react-query'
import { kemexQueryKeys } from '../../../app/query/queryKeys'
import { GENERIC_MODULES } from '../../../config/modules'
import { repository } from '../../../services/repositoryFactory'
import type {
  Asset,
  Customer,
  FuelOperation,
  InventoryItem,
  MaintenancePart,
  MaintenanceTechnician,
  Project,
  StockMovement,
  Warehouse,
  WorkOrder,
} from '../../../types/tfms'
import type { Trip, TripCost } from '../../trips/types'
import { tripCostsService, tripsService } from '../../trips/service'

function settle<T>(result: PromiseSettledResult<T>, label: string, fallback: T) {
  if (result.status === 'fulfilled') return { value: result.value, error: '' }
  return {
    value: fallback,
    error: `${label}: ${result.reason instanceof Error ? result.reason.message : 'تعذر تحميل البيانات'}`,
  }
}

export function useAssetQueries(userId: string | undefined) {
  return useQuery({
    queryKey: kemexQueryKeys.assets(userId),
    enabled: Boolean(userId),
    queryFn: () => repository.listAssets() as Promise<Asset[]>,
  })
}

export function useProjectQueries(userId: string | undefined) {
  return useQuery({
    queryKey: kemexQueryKeys.projects(userId),
    enabled: Boolean(userId),
    queryFn: () => repository.listProjects() as Promise<Project[]>,
  })
}

export function useMaintenanceQueries(userId: string | undefined) {
  const query = useQuery({
    queryKey: kemexQueryKeys.maintenance(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const results = await Promise.allSettled([
        repository.listWorkOrders(),
        repository.listMaintenanceTechnicians(),
        repository.listMaintenanceParts(),
      ])
      const workOrders = settle(results[0], 'أوامر الصيانة', [] as WorkOrder[])
      const technicians = settle(results[1], 'فنيو الصيانة', [] as MaintenanceTechnician[])
      const parts = settle(results[2], 'قطع غيار الصيانة', [] as MaintenancePart[])
      return {
        workOrders: workOrders.value,
        technicians: technicians.value,
        parts: parts.value,
        failures: [workOrders.error, technicians.error, parts.error].filter(Boolean),
      }
    },
  })
  return {
    ...query,
    workOrders: query.data?.workOrders ?? [],
    technicians: query.data?.technicians ?? [],
    parts: query.data?.parts ?? [],
    failures: query.data?.failures ?? [],
  }
}

export function useInventoryQueries(userId: string | undefined) {
  const query = useQuery({
    queryKey: kemexQueryKeys.inventory(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const results = await Promise.allSettled([
        repository.listWarehouses(),
        repository.listInventoryItems(),
        repository.listStockMovements(),
      ])
      const warehouses = settle(results[0], 'المخازن', [] as Warehouse[])
      const items = settle(results[1], 'أصناف المخزون', [] as InventoryItem[])
      const movements = settle(results[2], 'حركة المخزون', [] as StockMovement[])
      return {
        warehouses: warehouses.value,
        items: items.value,
        movements: movements.value,
        failures: [warehouses.error, items.error, movements.error].filter(Boolean),
      }
    },
  })
  return {
    ...query,
    warehouses: query.data?.warehouses ?? [],
    items: query.data?.items ?? [],
    movements: query.data?.movements ?? [],
    failures: query.data?.failures ?? [],
  }
}

export function useOperationsQueries(userId: string | undefined) {
  const query = useQuery({
    queryKey: kemexQueryKeys.operations(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const results = await Promise.allSettled([
        repository.listFuel(),
        repository.listClients(),
        repository.listCostCenters(),
        repository.listAssetTypes(),
        repository.listChargingRates(),
      ])
      const fuelOps = settle(results[0], 'الوقود', [] as FuelOperation[])
      const clients = settle(results[1], 'العملاء', [] as Customer[])
      const costCenters = settle(results[2], 'مراكز التكلفة', [] as Array<{ id: string; code: string; name: string; active: boolean }>)
      const assetTypes = settle(results[3], 'أنواع الأصول', [] as Array<{ id: string; code: string; name: string; defaultMeterType: string; standardConsumption?: number; billingUnit?: string; billingRate?: number; billingMinimum?: number; active: boolean }>)
      const chargingRates = settle(results[4], 'تعريفات التحميل', [] as Array<{ id: string; assetTypeId?: string; assetId?: string; projectId?: string; unit: string; rate: number; minimum?: number; active: boolean }>)
      return {
        fuelOps: fuelOps.value,
        clients: clients.value,
        costCenters: costCenters.value,
        assetTypes: assetTypes.value,
        chargingRates: chargingRates.value,
        failures: [fuelOps.error, clients.error, costCenters.error, assetTypes.error, chargingRates.error].filter(Boolean),
      }
    },
  })
  return {
    ...query,
    fuelOps: query.data?.fuelOps ?? [],
    clients: query.data?.clients ?? [],
    costCenters: query.data?.costCenters ?? [],
    assetTypes: query.data?.assetTypes ?? [],
    chargingRates: query.data?.chargingRates ?? [],
    failures: query.data?.failures ?? [],
  }
}

export function useTripQueries(userId: string | undefined) {
  const query = useQuery({
    queryKey: kemexQueryKeys.trips(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const results = await Promise.allSettled([tripsService.list(), tripCostsService.listAll()])
      const trips = settle(results[0], 'الرحلات', [] as Trip[])
      const tripCosts = settle(results[1], 'تكاليف النقل', [] as TripCost[])
      return {
        trips: trips.value,
        tripCosts: tripCosts.value,
        failures: [trips.error, tripCosts.error].filter(Boolean),
      }
    },
  })
  return {
    ...query,
    trips: query.data?.trips ?? [],
    tripCosts: query.data?.tripCosts ?? [],
    failures: query.data?.failures ?? [],
  }
}

export function useApprovalEventsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: kemexQueryKeys.approvalEvents(userId),
    enabled: Boolean(userId),
    queryFn: () => repository.listApprovalEvents(),
    staleTime: 15_000,
  })
}

export function useSettingsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: kemexQueryKeys.settings(userId),
    enabled: Boolean(userId),
    queryFn: () => repository.getSettings(),
  })
}

export function useModuleRecordsQueries(userId: string | undefined, activeRoute = 'dashboard') {
  const allModules = [...GENERIC_MODULES, 'oilChanges', 'tireOps']
  const coreModules = ['drivers', 'operations', 'contracts', 'customers', 'requests', 'assignments']
  const routeKey = activeRoute.split('/')[0]
  const needsAll = ['reports'].includes(routeKey)
  const routeModules = needsAll
    ? allModules
    : Array.from(new Set([
        ...coreModules,
        ...(allModules.includes(routeKey) ? [routeKey] : []),
        ...(routeKey === 'maintenance' ? ['plans', 'oilChanges', 'tireOps'] : []),
        ...(routeKey === 'breakdowns' ? ['costs', 'oilChanges', 'tireOps'] : []),
        ...(routeKey === 'inventory' || routeKey === 'purchases' ? ['inventory', 'purchases'] : []),
        ...(routeKey === 'invoices' || routeKey === 'customers' ? ['invoices', 'customers'] : []),
        ...(routeKey === 'costs' || routeKey === 'charging' ? ['costs', 'charging'] : []),
        ...(routeKey === 'trips' ? ['trips', 'fuel'] : []),
        ...(routeKey === 'audit' ? ['audit'] : []),
      ]))
  const queries = useQueries({
    queries: routeModules.map(module => ({
      queryKey: kemexQueryKeys.modules.record(userId, module),
      enabled: Boolean(userId),
      queryFn: () => repository.listModuleRecords(module),
      meta: { module },
    })),
  })

  const data: Record<string, Record<string, unknown>[]> = {}
  const failures: string[] = []
  routeModules.forEach((module, index) => {
    const query = queries[index]
    data[module] = query.data ?? []
    if (query.isError) failures.push(`${module}: ${query.error instanceof Error ? query.error.message : 'تعذر تحميل البيانات'}`)
  })

  return {
    data,
    failures,
    isPending: queries.some(query => query.isPending),
    isFetching: queries.some(query => query.isFetching),
    isError: queries.some(query => query.isError),
  }
}
