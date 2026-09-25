import { AlertTriangle, ArrowDownToLine, Boxes, Pencil, Plus, ShoppingCart, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { Asset, InventoryItem, Project, StockMovement, StockMovementType, Warehouse, WorkOrder } from '../types/tfms'
import { useCurrency } from '../features/settings'
import { Button, DataTable, PageHeader, StatusBadge } from '../components/ui'
import { OperationalSummaryStrip } from '../shared/ui'

/** Input accepted by the atomic stock-posting RPC. */
type PostMovementInput = {
  id?: string
  itemId: string
  movementType: StockMovementType
  quantity: number
  movementDate: string
  unitCost?: number
  warehouseId?: string
  assetId?: string
  workOrderId?: string
  projectId?: string
  referenceType?: string
  referenceId?: string
  notes?: string
}

type ItemDraft = InventoryItem & { openingQty: number; openingUnitCost: number }

type InventoryPageProps = {
  items: InventoryItem[]
  warehouses: Warehouse[]
  stockMovements: StockMovement[]
  userName: string
  assets: Asset[]
  projects: Project[]
  workOrders: WorkOrder[]
  onCreate: (input: ItemDraft) => Promise<InventoryItem>
  onUpdate: (item: InventoryItem) => Promise<void>
  onPostMovement: (input: PostMovementInput) => Promise<{ item: InventoryItem; movement: StockMovement }>
  onCreatePurchase: (item: InventoryItem) => Promise<void>
  onSaveWarehouse?: (warehouse: Warehouse) => Promise<void>
}

/** Inventory workspace backed by real stock balances and atomic database postings. */
export function InventoryPage({
  items,
  warehouses,
  stockMovements,
  userName,
  assets,
  projects,
  workOrders,
  onCreate,
  onUpdate,
  onPostMovement,
  onCreatePurchase,
  onSaveWarehouse,
}: InventoryPageProps) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<ItemDraft | null>(null)
  const [moving, setMoving] = useState<{ item: InventoryItem; type: StockMovementType } | null>(null)
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [showAllMoves, setShowAllMoves] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { formatMoney, formatNumber } = useCurrency()

  const filteredItems = items

  const lowStockCount = items.filter(item => {
    const threshold = Math.max(item.reorderPoint, item.minimumQty)
    return threshold > 0 && item.currentQty <= threshold
  }).length

  const inventoryValue = items.reduce((sum, item) => sum + item.currentQty * item.averageCost, 0)
  const recentMoves = showAllMoves ? stockMovements : stockMovements.slice(0, 12)

  function beginCreate() {
    setError('')
    setEditing({
      id: `SP-${Date.now()}`,
      code: '',
      name: '',
      category: 'قطع غيار',
      brand: '',
      unit: 'قطعة',
      barcode: '',
      warehouseId: warehouses[0]?.id,
      location: '',
      minimumQty: 0,
      maximumQty: 0,
      reorderPoint: 0,
      leadTimeDays: 0,
      averageCost: 0,
      lastPurchaseCost: 0,
      currentQty: 0,
      openingQty: 0,
      openingUnitCost: 0,
      active: true,
      notes: '',
    })
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || busy) return
    setBusy(true)
    setError('')

    try {
      const form = new FormData(event.currentTarget)
      const exists = items.some(item => item.id === editing.id)
      const next: ItemDraft = {
        ...editing,
        code: String(form.get('code') ?? '').trim(),
        name: String(form.get('name') ?? '').trim(),
        category: String(form.get('category') ?? editing.category) as InventoryItem['category'],
        brand: String(form.get('brand') ?? '').trim(),
        unit: String(form.get('unit') ?? '').trim(),
        barcode: String(form.get('barcode') ?? '').trim(),
        warehouseId: String(form.get('warehouseId') ?? '') || undefined,
        location: String(form.get('location') ?? '').trim(),
        minimumQty: Number(form.get('minimumQty') ?? 0),
        maximumQty: Number(form.get('maximumQty') ?? 0),
        reorderPoint: Number(form.get('reorderPoint') ?? 0),
        leadTimeDays: Number(form.get('leadTimeDays') ?? 0),
        averageCost: editing.averageCost,
        lastPurchaseCost: exists ? editing.lastPurchaseCost : Number(form.get('lastPurchaseCost') ?? 0),
        currentQty: editing.currentQty,
        openingQty: exists ? 0 : Number(form.get('openingQty') ?? 0),
        openingUnitCost: exists ? 0 : Number(form.get('openingUnitCost') ?? 0),
        active: editing.active,
        notes: String(form.get('notes') ?? '').trim(),
      }

      if (!next.code || !next.name || !next.unit) throw new Error('كود الصنف والاسم ووحدة القياس مطلوبة.')
      if (next.maximumQty > 0 && next.maximumQty < next.minimumQty) throw new Error('الحد الأقصى لا يمكن أن يكون أقل من الحد الأدنى.')
      if (next.reorderPoint > 0 && next.reorderPoint < next.minimumQty) throw new Error('نقطة إعادة الطلب لا يمكن أن تكون أقل من الحد الأدنى.')
      if ([next.minimumQty, next.maximumQty, next.reorderPoint, next.leadTimeDays, next.lastPurchaseCost, next.openingQty, next.openingUnitCost]
        .some(value => !Number.isFinite(value) || value < 0)) {
        throw new Error('الكميات والتكاليف يجب أن تكون أرقامًا غير سالبة.')
      }
      if (items.some(item => item.id !== next.id && item.code.toLowerCase() === next.code.toLowerCase())) {
        throw new Error('كود الصنف مستخدم بالفعل.')
      }

      if (exists) await onUpdate(next)
      else await onCreate(next)
      setEditing(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ الصنف.')
    } finally {
      setBusy(false)
    }
  }

  async function postMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!moving || busy) return
    setBusy(true)
    setError('')

    try {
      const form = new FormData(event.currentTarget)
      const quantity = Number(form.get('quantity') ?? 0)
      const movementType = String(form.get('movementType') ?? moving.type) as StockMovementType
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('أدخل كمية أكبر من صفر.')

      await onPostMovement({
        id: undefined,
        itemId: moving.item.id,
        movementType,
        quantity,
        movementDate: String(form.get('movementDate') ?? new Date().toISOString().slice(0, 10)),
        unitCost: Number(form.get('unitCost') ?? 0),
        warehouseId: String(form.get('warehouseId') ?? '') || undefined,
        assetId: String(form.get('assetId') ?? '') || undefined,
        workOrderId: String(form.get('workOrderId') ?? '') || undefined,
        projectId: String(form.get('projectId') ?? '') || undefined,
        referenceType: movementType === 'استلام' ? 'استلام مخزني' : movementType === 'صرف' ? 'صرف مخزني' : 'حركة مخزون',
        referenceId: String(form.get('referenceId') ?? '') || undefined,
        notes: String(form.get('notes') ?? '').trim() || `تم التسجيل بواسطة ${userName}`,
      })
      setMoving(null)
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'تعذر تسجيل حركة المخزون.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المخازن وقطع الغيار"
        action={<><Button variant="secondary" icon={<Boxes size={15} />} onClick={() => setWarehouseOpen(true)}>إدارة المخازن</Button><Button icon={<Plus size={16} />} onClick={beginCreate}>صنف جديد</Button></>}
      />

      {error && <div className="global-error" role="alert">{error}</div>}

      <div className="metric-grid compact">
        <Metric icon={Boxes} label="الأصناف" value={items.length} />
        <Metric icon={AlertTriangle} label="تحت حد إعادة الطلب" value={lowStockCount} />
        <Metric icon={ShoppingCart} label="قيمة المخزون" value={formatMoney(inventoryValue)} />
        <Metric icon={ArrowDownToLine} label="حركات المخزون" value={stockMovements.length} />
      </div>

      <OperationalSummaryStrip items={[
        { id: 'items', label: 'الأصناف', value: items.length },
        { id: 'low', label: 'تحت حد إعادة الطلب', value: lowStockCount, tone: lowStockCount ? 'alert' : 'success' },
        { id: 'value', label: 'قيمة المخزون', value: formatMoney(inventoryValue) },
        { id: 'moves', label: 'الحركات', value: stockMovements.length },
      ]} />

      <DataTable
        rows={filteredItems}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="ابحث بالكود أو اسم الصنف أو الباركود..."
        filters={[
          {
            id: 'stockHealth',
            label: 'حالة المخزون',
            options: [
              { value: 'low', label: 'تحت حد إعادة الطلب' },
              { value: 'normal', label: 'طبيعي' },
            ],
            getValue: item => {
              const threshold = Math.max(item.reorderPoint, item.minimumQty)
              return threshold > 0 && item.currentQty <= threshold ? 'low' : 'normal'
            },
          },
          {
            id: 'category',
            label: 'التصنيف',
            options: Array.from(new Set(items.map(item => item.category).filter(Boolean))).sort().map(value => ({ value, label: value })),
            getValue: item => item.category,
          },
        ]}
        columns={[
          { id:'code', header:'الكود', render:item=><strong>{item.code}</strong>, sortValue:item=>item.code },
          { id:'name', header:'الصنف', render:item=>item.name, sortValue:item=>item.name },
          { id:'category', header:'التصنيف', render:item=>item.category, sortValue:item=>item.category, hideOnMobile:true },
          { id:'warehouse', header:'المخزن', render:item=>warehouses.find(w=>w.id===item.warehouseId)?.name || '—', sortValue:item=>warehouses.find(w=>w.id===item.warehouseId)?.name || '' },
          { id:'balance', header:'الرصيد', render:item=>{const threshold=Math.max(item.reorderPoint,item.minimumQty);const low=threshold>0&&item.currentQty<=threshold;return <StatusBadge tone={low?'amber':'emerald'}>{`${formatNumber(item.currentQty)} ${item.unit}`}</StatusBadge>}, sortValue:item=>item.currentQty },
          { id:'threshold', header:'الحد / إعادة الطلب', render:item=>`${formatNumber(item.minimumQty)} / ${formatNumber(item.reorderPoint)}`, sortValue:item=>item.reorderPoint, hideOnMobile:true },
          { id:'averageCost', header:'متوسط التكلفة', render:item=>formatMoney(item.averageCost), sortValue:item=>item.averageCost, hideOnMobile:true },
          { id:'balanceValue', header:'قيمة الرصيد', render:item=>formatMoney(item.currentQty*item.averageCost), sortValue:item=>item.currentQty*item.averageCost, hideOnMobile:true },
          { id:'actions', header:'إجراءات', render:item=><div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" icon={<ArrowDownToLine size={13}/>} onClick={()=>setMoving({item,type:'استلام'})}>تسجيل حركة</Button>{Math.max(item.reorderPoint,item.minimumQty)>0&&item.currentQty<=Math.max(item.reorderPoint,item.minimumQty)&&<Button variant="secondary" size="sm" icon={<ShoppingCart size={13}/>} onClick={()=>void onCreatePurchase(item)}>طلب شراء</Button>}<Button variant="ghost" size="sm" icon={<Pencil size={14}/>} onClick={()=>setEditing({...item,openingQty:0,openingUnitCost:item.lastPurchaseCost})}>تعديل</Button></div> },
        ]}
        rowKey={item=>item.id}
        searchableText={item=>[item.code,item.name,item.category,item.brand,item.unit,item.barcode,item.location].join(' ')}
        emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد أصناف مطابقة.</div>}
        enableColumnVisibility
        columnVisibilityStorageKey="kemex.inventory.columns.v1"
        exportable
        exportFileName="KEMEX-inventory"
        pageSizeOptions={[15, 30, 60]}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">آخر حركات المخزون</h2><p className="text-sm font-medium text-gray-500">كل حركة تغيّر الرصيد في قاعدة البيانات داخل معاملة واحدة.</p></div><Button variant="secondary" onClick={() => setShowAllMoves(value => !value)}>{showAllMoves ? 'عرض آخر 12' : 'عرض كل الحركات'}</Button></div>
        <DataTable
          rows={recentMoves}
          columns={[
            { id:'movementNo', header:'الحركة', render:move=><strong>{move.movementNo}</strong>, sortValue:move=>move.movementNo },
            { id:'movementDate', header:'التاريخ', render:move=>move.movementDate, sortValue:move=>move.movementDate },
            { id:'movementType', header:'النوع', render:move=><StatusBadge tone={move.movementType==='استلام'?'emerald':move.movementType==='صرف'?'amber':'blue'}>{move.movementType}</StatusBadge>, sortValue:move=>move.movementType },
            { id:'item', header:'الصنف', render:move=>items.find(item=>item.id===move.itemId)?.name || move.itemId, sortValue:move=>items.find(item=>item.id===move.itemId)?.name || move.itemId },
            { id:'quantity', header:'الكمية', render:move=>formatNumber(move.quantity), sortValue:move=>move.quantity },
            { id:'unitCost', header:'التكلفة', render:move=>formatMoney(move.unitCost), sortValue:move=>move.unitCost },
            { id:'reference', header:'الربط', render:move=>move.workOrderId || move.assetId || move.projectId || '—' },
          ]}
          rowKey={move=>move.id}
          emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد حركات مخزون.</div>}
          enableColumnVisibility
          columnVisibilityStorageKey="kemex.stock-movements.columns.v1"
          exportable
          exportFileName="KEMEX-stock-movements"
        />
      </section>


      {editing && (
        <div className="modal-backdrop" onMouseDown={() => !busy && setEditing(null)}>
          <form className="modal-card wide form-modal-premium" onSubmit={saveItem} onMouseDown={event => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{items.some(item => item.id === editing.id) ? 'تعديل الصنف' : 'صنف جديد'}</h2>
                <p>{editing.currentQty ? `الرصيد الحالي: ${formatNumber(editing.currentQty)} ${editing.unit}` : 'إدخال بيانات الصنف الأساسية'}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="إغلاق">×</button>
            </div>
            <div className="form-sections">
              <FormBlock title="هوية الصنف" hint="بيانات التعريف داخل النظام">
                <Input name="code" label="كود الصنف" value={editing.code} required />
                <Input name="name" label="اسم الصنف" value={editing.name} required />
                <Select name="category" label="التصنيف" value={editing.category} options={['قطع غيار', 'زيوت', 'إطارات', 'مواد', 'أدوات', 'أخرى']} />
                <Input name="brand" label="الماركة / المصنع" value={editing.brand || ''} />
              </FormBlock>
              <FormBlock title="التخزين" hint="مكان التخزين والتعريف">
                <Select name="unit" label="وحدة القياس" value={editing.unit} options={['قطعة', 'طقم', 'لتر', 'عبوة', 'متر', 'كجم', 'علبة']} />
                <Select name="warehouseId" label="المخزن" value={editing.warehouseId || ''} options={warehouses.map(warehouse => ({ v: warehouse.id, l: `${warehouse.name} — ${warehouse.code}` }))} />
                <Input name="location" label="الموقع داخل المخزن" value={editing.location || ''} />
                <Input name="barcode" label="الباركود" value={editing.barcode || ''} />
              </FormBlock>
              <FormBlock title="الحدود والتكلفة" hint="إدارة إعادة الطلب والتكلفة">
                <Input name="minimumQty" label="الحد الأدنى" type="number" value={String(editing.minimumQty)} />
                <Input name="maximumQty" label="الحد الأقصى" type="number" value={String(editing.maximumQty)} />
                <Input name="reorderPoint" label="نقطة إعادة الطلب" type="number" value={String(editing.reorderPoint)} />
                <Input name="leadTimeDays" label="مدة التوريد بالأيام" type="number" value={String(editing.leadTimeDays)} />
                <div className="field"><span>متوسط التكلفة الحالي</span><div className="read-only-field">{formatMoney(editing.averageCost)}</div></div>
                {!items.some(item => item.id === editing.id) && <Input name="lastPurchaseCost" label="آخر تكلفة شراء" type="number" value={String(editing.lastPurchaseCost)} />}
                {!items.some(item => item.id === editing.id) && <Input name="openingQty" label="الرصيد الافتتاحي" type="number" value="0" />}
                {!items.some(item => item.id === editing.id) && <Input name="openingUnitCost" label="تكلفة الرصيد الافتتاحي" type="number" value="0" />}
              </FormBlock>
              <label className="field field-full"><span>ملاحظات</span><textarea name="notes" defaultValue={editing.notes || ''} rows={4} /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الصنف'}</button></div>
          </form>
        </div>
      )}

      {moving && (
        <div className="modal-backdrop" onMouseDown={() => !busy && setMoving(null)}>
          <form className="modal-card wide form-modal-premium" onSubmit={postMovement} onMouseDown={event => event.stopPropagation()}>
            <div className="modal-head"><div><h2>حركة مخزون</h2><p>{moving.item.code} — {moving.item.name} · الرصيد {formatNumber(moving.item.currentQty)} {moving.item.unit}</p></div><button type="button" className="icon-button" onClick={() => setMoving(null)} aria-label="إغلاق">×</button></div>
            <div className="form-sections">
              <FormBlock title="بيانات الحركة" hint="الحفظ والخصم والإضافة يتمان ذريًا في قاعدة البيانات">
                <Select name="movementType" label="نوع الحركة" value={moving.type} options={['استلام', 'صرف', 'مرتجع', 'تسوية زيادة', 'تسوية نقص']} />
                <Input name="quantity" label="الكمية" type="number" value="" required />
                <Input name="unitCost" label="تكلفة الوحدة" type="number" value={String(moving.item.averageCost || moving.item.lastPurchaseCost || 0)} />
                <Input name="movementDate" label="التاريخ" type="date" value={new Date().toISOString().slice(0, 10)} required />
                <Select name="warehouseId" label="المخزن" value={moving.item.warehouseId || ''} options={warehouses.map(warehouse => ({ v: warehouse.id, l: `${warehouse.name} — ${warehouse.code}` }))} />
                <Input name="referenceId" label="رقم المرجع" value="" />
              </FormBlock>
              <FormBlock title="الربط التشغيلي" hint="اختياري للاستلام ومهم للصرف">
                <SelectRef name="assetId" label="الأصل" options={assets.map(asset => ({ v: asset.id, l: `${asset.name} — ${asset.code}` }))} />
                <SelectRef name="workOrderId" label="أمر العمل" options={workOrders.map(order => ({ v: order.id, l: `${order.desc || order.type} — ${order.id}` }))} />
                <SelectRef name="projectId" label="المشروع" options={projects.map(project => ({ v: project.id, l: `${project.name} — ${project.code}` }))} />
              </FormBlock>
              <label className="field field-full"><span>ملاحظات الحركة</span><textarea name="notes" rows={3} /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setMoving(null)}>إلغاء</button><button className="primary-button" disabled={busy}>{busy ? 'جارٍ التسجيل...' : 'تسجيل الحركة'}</button></div>
          </form>
        </div>
      )}

      {warehouseOpen && <WarehouseModal warehouses={warehouses} onClose={() => setWarehouseOpen(false)} onSave={onSaveWarehouse} busy={busy} />}
    </div>
  )
}

function SelectRef({ name, label, options }: { name: string; label: string; options: { v: string; l: string }[] }) {
  return <label className="field"><span>{label}</span><select name={name} defaultValue=""><option value="">— غير مرتبط —</option>{options.map(option => <option key={option.v} value={option.v}>{option.l}</option>)}</select></label>
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return <div className="metric-card"><div className="metric-icon"><Icon size={18} /></div><div className="metric-body"><span>{label}</span><strong>{value}</strong></div></div>
}

function Input({ name, label, value = '', type = 'text', required = false }: { name: string; label: string; value?: string; type?: string; required?: boolean }) {
  return <label className="field"><span>{label}{required && ' *'}</span><input name={name} type={type} defaultValue={value} required={required} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} /></label>
}

function FormBlock({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return <section className="form-section"><div className="form-section-head"><strong>{title}</strong><span>{hint}</span></div><div className="form-grid">{children}</div></section>
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: string[] | { v: string; l: string }[] }) {
  return <label className="field"><span>{label}</span><select name={name} defaultValue={value}>{options.map(option => <option key={typeof option === 'string' ? option : option.v} value={typeof option === 'string' ? option : option.v}>{typeof option === 'string' ? option : option.l}</option>)}</select></label>
}

function WarehouseModal({ warehouses, onClose, onSave, busy }: { warehouses: Warehouse[]; onClose: () => void; onSave?: (warehouse: Warehouse) => Promise<void>; busy: boolean }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onSave || saving) return
    setSaving(true)
    setError('')
    try {
      const form = new FormData(event.currentTarget)
      const warehouse: Warehouse = {
        id: `WH-${Date.now()}`,
        code: String(form.get('code') ?? '').trim(),
        name: String(form.get('name') ?? '').trim(),
        location: String(form.get('location') ?? '').trim(),
        managerName: String(form.get('managerName') ?? '').trim(),
        active: true,
      }
      if (!warehouse.code || !warehouse.name) throw new Error('كود المخزن واسم المخزن مطلوبان.')
      if (warehouses.some(item => item.code.toLowerCase() === warehouse.code.toLowerCase())) throw new Error('كود المخزن مستخدم بالفعل.')
      await onSave(warehouse)
      event.currentTarget.reset()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ المخزن.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={() => !saving && onClose()}>
      <div className="modal-card wide form-modal-premium" onMouseDown={event => event.stopPropagation()}>
        <div className="modal-head"><div><h2>إدارة المخازن</h2><p>تعريف المخازن الفعلية التي تتحرك من خلالها الأصناف.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق">×</button></div>
        <div className="form-sections">
          <DataTable
            rows={warehouses}
            columns={[
              { id:'code', header:'الكود', render:warehouse=><strong>{warehouse.code}</strong>, sortValue:warehouse=>warehouse.code },
              { id:'name', header:'المخزن', render:warehouse=>warehouse.name, sortValue:warehouse=>warehouse.name },
              { id:'location', header:'الموقع', render:warehouse=>warehouse.location || '—', sortValue:warehouse=>warehouse.location || '' },
              { id:'manager', header:'المسؤول', render:warehouse=>warehouse.managerName || '—', sortValue:warehouse=>warehouse.managerName || '' },
            ]}
            rowKey={warehouse=>warehouse.id}
            emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد مخازن معرفة بعد.</div>}
          />
          <form onSubmit={submit} className="panel"><div className="panel-heading"><h3>إضافة مخزن</h3></div><div className="form-grid"><Input name="code" label="كود المخزن" required /><Input name="name" label="اسم المخزن" required /><Input name="location" label="الموقع" /><Input name="managerName" label="المسؤول" /></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>إغلاق</button><button className="primary-button" disabled={saving || busy || !onSave}>{saving ? 'جارٍ الحفظ...' : 'حفظ المخزن'}</button></div></form>
        </div>
      </div>
    </div>
  )
}
