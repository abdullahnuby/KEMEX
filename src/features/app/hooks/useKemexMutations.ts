import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { repository } from '../../../services/repositoryFactory'
import { kemexQueryKeys } from '../../../app/query/queryKeys'
import type { Repository } from '../../../core/repository/types'
import type {
  Asset,
  Customer,
  FuelOperation,
  InventoryItem,
  MaintenanceTechnician,
  Project,
  Warehouse,
  WorkOrder,
} from '../../../types/tfms'

export type KemexModuleRecord = Record<string, unknown>

export type KemexWorkflowAction = {
  key: string
  label: string
  to: string
  from: string[]
  roles: string[]
}

type UseKemexMutationsOptions = {
  userId?: string
  userName?: string
  route: string
  assets: Asset[]
  moduleData: Record<string, KemexModuleRecord[]>
  navigate: (route: string) => void
}

export function useKemexMutations({
  userId,
  userName,
  route,
  assets,
  moduleData,
  navigate,
}: UseKemexMutationsOptions) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const invalidateData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: kemexQueryKeys.all })
  }, [queryClient])

  const clearBootstrapCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: kemexQueryKeys.all })
  }, [queryClient])

  const formatError = useCallback((err: unknown) => (
    err instanceof Error ? err.message : 'تعذر تنفيذ العملية. حاول مرة أخرى.'
  ), [])

  const saveProject = useCallback(async (project: Project) => {
    try {
      await repository.saveProject(project)
      setError('')
      await invalidateData()
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر حفظ المشروع: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const saveClient = useCallback(async (client: Customer) => {
    try {
      await repository.saveClient(client)
      setError('')
      await invalidateData()
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر حفظ العميل: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const saveAsset = useCallback(async (asset: Asset) => {
    const normalized = asset.id.startsWith('NEW-') ? { ...asset, id: `A-${Date.now()}` } : asset
    try {
      await repository.saveAsset(normalized)
      setError('')
      await invalidateData()
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر حفظ الأصل: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const saveMaintenanceTechnician = useCallback(async (technician: MaintenanceTechnician) => {
    try {
      await repository.saveMaintenanceTechnician(technician)
      setError('')
      await invalidateData()
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر حفظ الفني: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const saveWarehouse = useCallback(async (warehouse: Warehouse) => {
    try {
      await repository.saveWarehouse(warehouse)
      setError('')
      await invalidateData()
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر حفظ المخزن: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const saveInventoryItem = useCallback(async (item: InventoryItem) => {
    try {
      await repository.updateInventoryItem(item)
      setError('')
      await invalidateData()
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر حفظ الصنف: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const createInventoryItem = useCallback(async (
    input: Omit<InventoryItem, 'currentQty' | 'openingQty'> & { openingQty: number; openingUnitCost: number },
  ) => {
    try {
      const created = await repository.createInventoryItem(input)
      setError('')
      await invalidateData()
      return created
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر إنشاء الصنف: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const postStockMovement = useCallback(async (
    input: Parameters<Repository['postStockMovement']>[0],
  ) => {
    try {
      const result = await repository.postStockMovement(input)
      setError('')
      await invalidateData()
      return result
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر تسجيل حركة المخزون: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const receivePurchase = useCallback(async (input: {
    purchase: KemexModuleRecord
    inventoryItemId: string
    warehouseId: string
    quantity: number
    unitCost: number
    notes: string
  }) => {
    const result = await postStockMovement({
      id: `SM-${Date.now()}`,
      itemId: input.inventoryItemId,
      movementType: 'استلام',
      quantity: input.quantity,
      movementDate: new Date().toISOString().slice(0, 10),
      unitCost: input.unitCost,
      warehouseId: input.warehouseId,
      projectId: String(input.purchase.proj ?? '') || undefined,
      referenceType: 'purchase',
      referenceId: String(input.purchase.po ?? input.purchase.number ?? input.purchase.id ?? ''),
      notes: input.notes || `استلام مرتبط بأمر شراء ${String(input.purchase.po ?? input.purchase.number ?? '')}`,
    })
    return result.movement
  }, [postStockMovement])

  const saveWorkOrder = useCallback(async (workOrder: WorkOrder) => {
    try {
      await repository.saveWorkOrder(workOrder)
      setError('')
      await invalidateData()
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر حفظ أمر الصيانة: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const saveFuelOperation = useCallback(async (operation: FuelOperation) => {
    try {
      await repository.saveFuelOperation(operation)
      setError('')
      await invalidateData()
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر حفظ حركة الوقود: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const saveModule = useCallback(async (module: string, record: KemexModuleRecord) => {
    try {
      await repository.saveModuleRecord(module, record)
      setError('')
      await invalidateData()
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر حفظ السجل: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  const createPurchaseFromInventory = useCallback(async (item: KemexModuleRecord) => {
    const records = moduleData.purchases ?? []
    const next: KemexModuleRecord = {
      id: `PR-${Date.now()}`,
      number: `PR-${100 + records.length + 1}`,
      date: new Date().toISOString().slice(0, 10),
      req: userName ?? '',
      desc: String(item.name ?? ''),
      qty: Number(item.qty ?? item.min ?? 1),
      unit: String(item.unit ?? ''),
      est: Number(item.min || 1) * Number(item.cost || 0),
      proj: '',
      status: 'قيد الاعتماد',
      po: '',
      supplier: '',
      notes: `طلب إعادة طلب للصنف ${String(item.code ?? '')}`,
    }
    await saveModule('purchases', next)
    navigate('purchases')
  }, [moduleData.purchases, navigate, saveModule, userName])

  const workflowModule = useCallback(async (
    record: KemexModuleRecord,
    previous: KemexModuleRecord,
    action: KemexWorkflowAction,
  ) => {
    const today = new Date().toISOString().slice(0, 10)

    if (route === 'operations' && action.key === 'approve') {
      const assetId = String(record.assetId ?? '')
      const asset = assets.find(item => item.id === assetId)
      if (asset) {
        const nextMeter = Number(record.meter ?? 0)
        const nextAsset = {
          ...asset,
          meter: Number.isFinite(nextMeter) && nextMeter > asset.meter ? nextMeter : asset.meter,
          status: (asset.status === 'متاح' || asset.status === 'محجوز')
            ? (asset.own === 'مملوك' ? 'مخصص لمشروع' : 'يعمل')
            : asset.status,
        }
        if (JSON.stringify(nextAsset) !== JSON.stringify(asset)) await saveAsset(nextAsset)
      }
    }

    if (route === 'assignments' && action.key === 'end') {
      const assetId = String(record.asset ?? '')
      const asset = assets.find(item => item.id === assetId)
      if (asset) {
        const approvedMeters = (moduleData.operations ?? [])
          .filter(item => String(item.assetId ?? '') === asset.id && String(item.status ?? '') === 'معتمد')
          .map(item => Number(item.meter ?? 0))
          .filter(Number.isFinite)
        const maxApproved = approvedMeters.length ? Math.max(...approvedMeters) : asset.meter
        await saveAsset({
          ...asset,
          meter: Math.max(asset.meter, maxApproved),
          status: 'متاح',
          proj: asset.own === 'مملوك' ? '' : asset.proj,
        })
      }
      const reqId = String(record.req ?? '')
      if (reqId) {
        const req = (moduleData.requests ?? []).find(item => String(item.id ?? '') === reqId)
        if (req) {
          await saveModule('requests', {
            ...req,
            status: 'مكتمل',
            apprs: [
              ...(Array.isArray(req.apprs) ? req.apprs : []),
              { by: userName ?? 'النظام', act: 'إغلاق بعد إنهاء التخصيص' },
            ],
          })
        }
      }
    }

    if (route === 'requests' && action.key === 'close') {
      const reqId = String(record.id ?? '')
      const assignment = (moduleData.assignments ?? []).find(
        item => String(item.req ?? '') === reqId && String(item.status ?? '') === 'ساري',
      )
      if (assignment) {
        await saveModule('assignments', { ...assignment, status: 'منتهي', toA: today })
        const asset = assets.find(item => item.id === String(assignment.asset ?? ''))
        if (asset) await saveAsset({ ...asset, status: 'متاح', proj: asset.own === 'مملوك' ? '' : asset.proj })
      }
    }

    // Keep the previous snapshot in the contract so future workflow policies can diff state explicitly.
    void previous
    await saveModule(route, record)
  }, [assets, moduleData.assignments, moduleData.operations, moduleData.requests, route, saveAsset, saveModule, userName])

  const deleteModule = useCallback(async (module: string, id: string) => {
    try {
      await repository.deleteModuleRecord(module, id)
      setError('')
      await invalidateData()
    } catch (err) {
      const message = formatError(err)
      setError(`تعذر حذف السجل: ${message}`)
      throw err
    }
  }, [formatError, invalidateData])

  return {
    error,
    saveProject,
    saveClient,
    saveAsset,
    saveMaintenanceTechnician,
    saveWarehouse,
    saveInventoryItem,
    createInventoryItem,
    postStockMovement,
    receivePurchase,
    saveWorkOrder,
    saveFuelOperation,
    saveModule,
    createPurchaseFromInventory,
    workflowModule,
    deleteModule,
    invalidateData,
    clearBootstrapCache,
  }
}
