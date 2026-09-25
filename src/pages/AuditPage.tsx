import { useMemo, useState } from 'react'
import { ClipboardPenLine, Download, ShieldCheck } from 'lucide-react'
import type { Asset, Driver, Project, WorkOrder } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'
import { displayReference } from '../utils/referenceLabels'
import { Button, DataTable, MetricCard, PageHeader, StatusBadge } from '../components/ui'
import { OperationalSummaryStrip } from '../shared/ui'

import { APP_LOCALE } from '../shared/formatters/locale'
type Props={records:Record<string,unknown>[];approvalEvents?:Record<string,unknown>[];assets?:Asset[];projects?:Project[];drivers?:Driver[];workOrders?:WorkOrder[];moduleData?:Record<string,Record<string,unknown>[]>}
export function AuditPage({records,approvalEvents=[],assets=[],projects=[],drivers=[],workOrders=[],moduleData={}}:Props){
 const [q,setQ]=useState('');const [action,setAction]=useState('');const [source,setSource]=useState('');const [timeline,setTimeline]=useState<'audit'|'workflow'>('audit')
 const actions=useMemo(()=>Array.from(new Set(records.map(x=>String(x.action??'')).filter(Boolean))),[records]);const sources=useMemo(()=>Array.from(new Set(records.map(x=>String(x.source??'')).filter(Boolean))),[records]);
 const workflowRows=useMemo(()=>approvalEvents,[approvalEvents]);
 const rows=useMemo(()=>records.filter(r=>(!action||String(r.action)===action)&&(!source||String(r.source)===source)),[records,action,source])
 const searchableText=(r:Record<string,unknown>)=>Object.values(r).map(v=>String(v??'')).join(' ')
 function exportCsv(){const headers=['التاريخ والوقت','المستخدم','العملية','نوع السجل','المرجع','التفاصيل','المصدر'];const esc=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`;const csv='\ufeff'+[headers.map(esc).join(','),...rows.map(r=>[r.ts,r.user,r.action,r.entity,displayReference('ref',r.ref,{assets,projects,drivers,workOrders,records:moduleData}),r.details,r.source].map(esc).join(','))].join('\r\n');const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`KEMEX-audit-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href)}
 return (
  <div className="space-y-6">
    <PageHeader title="سجل التدقيق" description="جميع العمليات الحساسة: المستخدم، العملية، التفاصيل والمصدر — سجل قراءة محمي." action={<Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv}>تصدير CSV</Button>} />
    <OperationalSummaryStrip items={timeline==='audit'?[{id:'total',label:'إجمالي الأحداث',value:records.length},{id:'visible',label:'الأحداث المعروضة',value:rows.length},{id:'actions',label:'أنواع العمليات',value:actions.length}]:[{id:'workflow',label:'أحداث دورة العمل',value:workflowRows.length},{id:'approvals',label:'اعتمادات',value:workflowRows.filter(r=>String(r.toStatus??'').includes('معتمد')||String(r.toStatus??'').includes('مكتمل')).length},{id:'actors',label:'المستخدمون المؤثرون',value:new Set(workflowRows.map(r=>String(r.actedBy??'')).filter(Boolean)).size}]} />
    <div className="flex flex-wrap gap-2"><Button variant={timeline==='audit'?'primary':'secondary'} onClick={()=>setTimeline('audit')}>سجل التدقيق</Button><Button variant={timeline==='workflow'?'primary':'secondary'} onClick={()=>setTimeline('workflow')}>سجل الاعتمادات ودورات العمل</Button></div>
    {timeline==='audit' ? <><div className="grid gap-4 sm:grid-cols-2">
      <MetricCard label="إجمالي الأحداث" value={records.length} icon={ShieldCheck} />
      <MetricCard label="الأحداث المعروضة" value={rows.length} icon={ClipboardPenLine} />
    </div></> : <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="أحداث دورة العمل" value={workflowRows.length} icon={ClipboardPenLine}/><MetricCard label="اعتمادات" value={workflowRows.filter(r=>String(r.toStatus??'').includes('معتمد')||String(r.toStatus??'').includes('مكتمل')).length} icon={ShieldCheck}/><MetricCard label="آخر حدث" value={workflowRows[0]?.actedAt ? formatDateTime(String(workflowRows[0].actedAt)) : '—'} icon={ClipboardPenLine}/></div>}
    {timeline==='audit' && <DataTable
      rows={rows}
      columns={[
        { id: 'ts', header: 'التاريخ والوقت', render: r => formatDateTime(String(r.ts ?? '')), sortValue: r => String(r.ts ?? '') },
        { id: 'user', header: 'المستخدم', render: r => String(r.user ?? '—'), sortValue: r => String(r.user ?? '') },
        { id: 'action', header: 'العملية', render: r => <StatusBadge tone={/حذف|رفض/.test(String(r.action)) ? 'red' : /اعتماد/.test(String(r.action)) ? 'emerald' : 'blue'}>{String(r.action ?? '—')}</StatusBadge>, sortValue: r => String(r.action ?? '') },
        { id: 'entity', header: 'نوع السجل', render: r => String(r.entity ?? '—'), sortValue: r => String(r.entity ?? '') },
        { id: 'ref', header: 'المرجع', render: r => <ReferenceValue field="ref" value={r.ref} lookups={{assets,projects,drivers,workOrders,records:moduleData}} /> },
        { id: 'details', header: 'التفاصيل', render: r => String(r.details ?? '—') },
        { id: 'source', header: 'المصدر', render: r => String(r.source ?? '—'), sortValue: r => String(r.source ?? '') },
      ]}
      rowKey={r => String(r.id)}
      searchable
      search={q}
      onSearchChange={setQ}
      searchableText={searchableText}
      filters={[
        { id: 'action', label: 'العملية', options: actions.map(value => ({ value, label: value })), getValue: r => String(r.action ?? '') },
        { id: 'source', label: 'المصدر', options: sources.map(value => ({ value, label: value })), getValue: r => String(r.source ?? '') },
      ]}
      mobilePresentation="cards"
      enableColumnVisibility
      columnVisibilityStorageKey="kemex.audit.columns.v1"
      exportable
      exportFileName="KEMEX-audit"
      printTitle="سجل التدقيق"
      emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد أحداث مطابقة.</div>}
    />}
    {timeline==='workflow' && <DataTable mobilePresentation="cards" enableColumnVisibility columnVisibilityStorageKey="kemex.workflow-audit.columns.v1" exportable exportFileName="KEMEX-workflow-audit" printTitle="سجل دورات العمل والاعتمادات" rows={workflowRows} columns={[
      {id:'actedAt',header:'التاريخ والوقت',render:r=>formatDateTime(String(r.actedAt??'')),sortValue:r=>String(r.actedAt??'')},
      {id:'module',header:'الوحدة',render:r=>String(r.module??'—')},
      {id:'record',header:'السجل',render:r=>String(r.recordId??'—')},
      {id:'transition',header:'الانتقال',render:r=><StatusBadge tone={/رفض|ملغ/.test(String(r.toStatus??''))?'red':/اعتمد|مكتمل|مدفوع|محصلة/.test(String(r.toStatus??''))?'emerald':'blue'}>{`${String(r.fromStatus??'—')} ← ${String(r.toStatus??'—')}`}</StatusBadge>},
      {id:'actor',header:'المستخدم',render:r=>String(r.actedBy??'—')},
      {id:'comment',header:'الملاحظة',render:r=>String(r.comment??'—')},
    ]} rowKey={r=>String(r.id)} searchable search={q} onSearchChange={setQ} searchableText={r=>Object.values(r).map(v=>String(v??'')).join(' ')} emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد أحداث دورة عمل.</div>} />}
  </div>
 )
}
function formatDateTime(v:string){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat(APP_LOCALE,{dateStyle:'medium',timeStyle:'short'}).format(d)}
