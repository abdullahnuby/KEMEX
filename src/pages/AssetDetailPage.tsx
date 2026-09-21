import { useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, Pencil, Truck } from 'lucide-react'
import type { Asset, FuelOperation, Operation, Project, WorkOrder } from '../types/tfms'
import { StatusBadge } from '../components/StatusBadge'
import { ReferenceValue } from '../components/ReferenceValue'
import type { ReferenceLookups } from '../utils/referenceLabels'
import { sameReference } from '../utils/referenceLabels'

type Tab = 'overview' | 'assignments' | 'operations' | 'fuel' | 'maintenance' | 'tires' | 'costs' | 'audit'

export function AssetDetailPage({ asset, assets, projects, operations, fuelOps, workOrders, moduleData, onBack, onEdit, onRoute }: {
  asset?: Asset; assets: Asset[]; projects: Project[]; operations: Operation[]; fuelOps: FuelOperation[]; workOrders: WorkOrder[];
  moduleData: Record<string, Record<string, unknown>[]>; onBack: () => void; onEdit: (asset: Asset) => void; onRoute: (route: string) => void
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const assetOps = useMemo(() => operations.filter(x => asset && sameReference(x.assetId, asset)), [operations, asset])
  const assetFuel = useMemo(() => fuelOps.filter(x => asset && sameReference(x.assetId, asset)), [fuelOps, asset])
  const assetOrders = useMemo(() => workOrders.filter(x => asset && sameReference(x.asset, asset)), [workOrders, asset])
  if (!asset) return <section className="panel"><div className="empty">الأصل غير موجود أو تم حذفه.</div><button className="secondary-button" onClick={onBack}>العودة للأصول</button></section>
  const project = projects.find(x => sameReference(asset.proj, x))
  const lookups: ReferenceLookups = { assets, projects, workOrders, records: moduleData }
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'بطاقة الأصل' }, { id: 'assignments', label: 'التخصيصات' }, { id: 'operations', label: 'التشغيل' },
    { id: 'fuel', label: 'الوقود والاستهلاك' }, { id: 'maintenance', label: 'الصيانة' }, { id: 'tires', label: 'الإطارات' },
    { id: 'costs', label: 'التكاليف' }, { id: 'audit', label: 'سجل التدقيق' },
  ]
  const renderRows = (rows: Record<string, unknown>[], empty: string) => rows.length ? <div className="table-wrap"><table><thead><tr>{Object.keys(rows[0]).filter(k => k !== 'id').slice(0, 7).map(k => <th key={k}>{fieldLabel(k)}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={String(row.id ?? i)}>{Object.keys(rows[0]).filter(k => k !== 'id').slice(0, 7).map(k => <td key={k}><ReferenceValue field={k} value={row[k]} lookups={lookups}/></td>)}</tr>)}</tbody></table></div> : <div className="empty">{empty}</div>
  return <div>
    <div className="page-head"><div><button className="secondary-button" onClick={onBack}><ArrowRight size={16}/> العودة للأصول</button><h1>بطاقة الأصل — {asset.name}</h1><div className="entity-subtitle"><span>الأصل</span><b className="entity-code">{asset.code}</b></div><p>{asset.mt === 'كم' ? `${fmt(asset.meter)} كم` : `${fmt(asset.meter)} ساعة`} · <StatusBadge>{asset.status}</StatusBadge> · {asset.own}{asset.plate ? ` · لوحة: ${asset.plate}` : ''}</p></div><button className="primary-button" onClick={() => onEdit(asset)}><Pencil size={16}/> تعديل بيانات الأصل</button></div>
    <div className="tabs-bar">{tabs.map(t => <button key={t.id} className={`tab-button ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
    {tab === 'overview' && <><section className="panel"><h2><Truck size={18}/> بيانات الأصل</h2><div className="detail-grid">
      <Detail label="الكود" value={asset.code}/><Detail label="اسم الأصل" value={asset.name}/><Detail label="الفئة" value={asset.cat}/><Detail label="النوع" value={asset.type}/><Detail label="الملكية" value={asset.own}/><Detail label="الحالة الفنية" value={asset.cond}/><Detail label="الشركة المصنعة" value={asset.mfr}/><Detail label="الطراز" value={asset.model}/><Detail label="سنة الصنع" value={asset.year}/><Detail label="المشروع الحالي" value={<ReferenceValue field="proj" value={asset.proj} lookups={lookups} compact/>}/><Detail label="المسؤول عن العهدة" value={<ReferenceValue field="cust" value={asset.cust} lookups={lookups} compact/>}/><Detail label="نوع الوقود" value={asset.fuel}/><Detail label="نوع العداد" value={asset.mt}/><Detail label="قراءة العداد" value={asset.meter}/><Detail label="الاستهلاك المعياري" value={asset.std ? `${asset.std} ${asset.mt === 'كم' ? 'لتر/100 كم' : 'لتر/ساعة'}` : undefined}/><Detail label="رقم اللوحة" value={asset.plate}/><Detail label="تاريخ الشراء أو الاستلام" value={asset.buy}/><Detail label="انتهاء الترخيص" value={asset.lic}/><Detail label="انتهاء التأمين" value={asset.ins}/>
      {asset.own === 'مملوك' && <><Detail label="القيمة الرأسمالية" value={asset.capex}/><Detail label="العمر الإنتاجي (سنة)" value={asset.life}/><Detail label="القيمة المتبقية" value={asset.resid}/></>}
      <Detail label="عقد الإيجار" value={<ReferenceValue field="contract" value={asset.contract} lookups={lookups} compact/>}/>
    </div></section></>}
    {tab === 'assignments' && <section className="panel"><h2>التخصيصات</h2>{renderRows((moduleData.assignments ?? []).filter(r => sameReference(r.assetId ?? r.asset, asset)), 'لا توجد تخصيصات مسجلة لهذا الأصل.')}</section>}
    {tab === 'operations' && <section className="panel"><h2>سجل التشغيل</h2>{renderRows(assetOps as unknown as Record<string, unknown>[], 'لا توجد عمليات تشغيل مسجلة لهذا الأصل.')}</section>}
    {tab === 'fuel' && <section className="panel"><h2>الوقود والاستهلاك</h2><div className="detail-grid"><Detail label="إجمالي الوقود (لتر)" value={assetFuel.reduce((n, x) => n + Number(x.qty || 0), 0)}/><Detail label="إجمالي التكلفة" value={assetFuel.reduce((n, x) => n + Number(x.total || 0), 0)}/></div>{renderRows(assetFuel as unknown as Record<string, unknown>[], 'لا توجد عمليات وقود مسجلة لهذا الأصل.')}</section>}
    {tab === 'maintenance' && <section className="panel"><h2>أوامر الصيانة</h2>{renderRows(assetOrders as unknown as Record<string, unknown>[], 'لا توجد أوامر صيانة مسجلة لهذا الأصل.')}<button className="secondary-button" onClick={() => onRoute('maintenance')}>فتح وحدة الصيانة</button></section>}
    {tab === 'tires' && <section className="panel"><h2>الإطارات</h2>{renderRows((moduleData.tires ?? []).filter(r => sameReference(r.assetId ?? r.asset, asset)), 'لا توجد سجلات إطارات مرتبطة بهذا الأصل.')}</section>}
    {tab === 'costs' && <section className="panel"><h2>التكاليف</h2>{renderRows((moduleData.costs ?? []).filter(r => sameReference(r.assetId ?? r.asset, asset)), 'لا توجد تكاليف مسجلة لهذا الأصل.')}</section>}
    {tab === 'audit' && <section className="panel"><h2>سجل التدقيق</h2>{renderRows((moduleData.audit ?? []).filter(r => sameReference(r.entityId ?? r.ref ?? r.assetId, asset) || String(r.entity ?? '').includes(asset.code)), 'لا تتوفر أحداث تدقيق مرتبطة بهذا الأصل.')}</section>}
  </div>
}
function Detail({ label, value }: { label: string; value: ReactNode }) { return <div className="detail-item"><span>{label}</span><strong>{value ?? '—'}</strong></div> }
function fieldLabel(key: string) { const labels: Record<string, string> = { date: 'التاريخ', type: 'النوع', hours: 'الساعات', meter: 'العداد', qty: 'الكمية', total: 'الإجمالي', status: 'الحالة', desc: 'الوصف', opened: 'تاريخ الفتح', prio: 'الأولوية', proj: 'المشروع', drv: 'السائق', notes: 'ملاحظات', name: 'الاسم', code: 'الكود' }; return labels[key] ?? key }
const fmt = (n: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(n || 0)
