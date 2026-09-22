import { useQuery } from '@tanstack/react-query'
import { GENERIC_MODULES } from '../../../config/modules'
import { repository } from '../../../services/repositoryFactory'
import type { Asset, Customer, FuelOperation, InventoryItem, MaintenancePart, MaintenanceTechnician, Project, StockMovement, Warehouse, WorkOrder } from '../../../types/tfms'
import type { Trip, TripCost } from '../../trips/types'
import { tripCostsService, tripsService } from '../../trips/service'

export interface BootstrapSettings {
  alertDays: number
  alertKm: number
  alertHours: number
  vat: number
  diesel: number
  petrol: number
  currencyCode: string
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
  settings: BootstrapSettings
  failures: string[]
}

const TITLES: Record<string, string> = {
  requests:'طلبات المعدات', assignments:'التخصيصات', operations:'التشغيل اليومي', trips:'الرحلات', drivers:'السائقون والمشغلون', contracts:'عقود الإيجار',
  plans:'خطط الصيانة', oils:'الزيوت والفلاتر', tires:'الإطارات', inventory:'المخازن وقطع الغيار', movements:'حركة المخزون', purchases:'المشتريات',
  costs:'التكاليف والإهلاك', charging:'التحميل الداخلي', invoices:'الفواتير والمستحقات', customers:'العملاء', audit:'سجل التدقيق',
}

/** Cached bootstrap query used by all existing pages until each feature gets its own query in later sprints. */
export function useKemexBootstrap(userId: string | undefined) {
  return useQuery<KemexBootstrapData>({
    queryKey: ['kemex', 'bootstrap', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
          const jobs = await Promise.allSettled([
        repository.listAssets(), repository.listProjects(), repository.listWorkOrders(), repository.listFuel(), repository.listClients(), repository.listCostCenters(), repository.listAssetTypes(), repository.listChargingRates(),
        repository.listWarehouses(), repository.listInventoryItems(), repository.listStockMovements(), repository.listMaintenanceTechnicians(), repository.listMaintenanceParts(), tripsService.list(), tripCostsService.listAll(),
        ...GENERIC_MODULES.map(key => repository.listModuleRecords(key)),
        repository.listModuleRecords('oilChanges'), repository.listModuleRecords('tireOps'),
        repository.getSettings(),
      ])
      const failures: string[] = []
      const pick = <T,>(index: number, fallback: T, label: string): T => {
        const result = jobs[index]
        if (result.status === 'fulfilled') return result.value as T
        failures.push(`${label}: ${result.reason instanceof Error ? result.reason.message : 'تعذر تحميل البيانات'}`)
        return fallback
      }

      const assets = pick(0, [] as Asset[], 'الأصول')
      const projects = pick(1, [] as Project[], 'المشروعات')
      const workOrders = pick(2, [] as WorkOrder[], 'أوامر الصيانة')
      const fuelOps = pick(3, [] as FuelOperation[], 'الوقود')
      const clients = pick(4, [] as Customer[], 'العملاء')
      const costCenters = pick(5, [] as Array<{ id:string; code:string; name:string; active:boolean }>, 'مراكز التكلفة')
      const assetTypes = pick(6, [] as KemexBootstrapData['assetTypes'], 'أنواع الأصول')
      const chargingRates = pick(7, [] as KemexBootstrapData['chargingRates'], 'تعريفات التحميل')
      const warehouses = pick(8, [] as Warehouse[], 'المخازن')
      const inventoryItems = pick(9, [] as InventoryItem[], 'أصناف المخزون')
      const stockMovements = pick(10, [] as StockMovement[], 'حركة المخزون')
      const maintenanceTechnicians = pick(11, [] as MaintenanceTechnician[], 'فنيّو الصيانة')
      const maintenanceParts = pick(12, [] as MaintenancePart[], 'قطع غيار الصيانة')
      const trips = pick(13, [] as Trip[], 'النقل')
      const tripCosts = pick(14, [] as TripCost[], 'تكاليف النقل')
      const moduleData: Record<string, Record<string, unknown>[]> = {}
      GENERIC_MODULES.forEach((key, index) => { moduleData[key] = pick(index + 15, [], TITLES[key] ?? key) })
      moduleData.oilChanges = pick(15 + GENERIC_MODULES.length, [], 'سجل تغييرات الزيوت')
      moduleData.tireOps = pick(16 + GENERIC_MODULES.length, [], 'سجل أعمال الإطارات')
      const settingsRaw = pick(17 + GENERIC_MODULES.length, {}, 'الإعدادات') as Record<string, unknown>

      return {
        assets, projects, workOrders, fuelOps, clients, costCenters, assetTypes, chargingRates, warehouses, inventoryItems, stockMovements, maintenanceTechnicians, maintenanceParts, trips, tripCosts, moduleData,
        settings: {
          alertDays: Number(settingsRaw.alert_days ?? 30), alertKm: Number(settingsRaw.alert_km ?? 1500), alertHours: Number(settingsRaw.alert_hours ?? 80),
          currencyCode: String(settingsRaw.currency_code ?? 'EGP'),
          vat: Number(settingsRaw.vat ?? 0), diesel: Number(settingsRaw.diesel ?? 0), petrol: Number(settingsRaw.petrol ?? 0),
        },
        failures,
      }
    },
  })
}
