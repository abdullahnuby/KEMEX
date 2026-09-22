import { useMemo, useState } from 'react'
import { ClipboardPenLine, Download, ShieldCheck } from 'lucide-react'
import type { Asset, Driver, Project, WorkOrder } from '../types/tfms'
import { ReferenceValue } from '../components/ReferenceValue'
import { displayReference } from '../utils/referenceLabels'
import { Button, DataTable, MetricCard, PageHeader, StatusBadge } from '../components/ui'

type Props={records:Record<string,unknown>[];assets?:Asset[];projects?:Project[];drivers?:Driver[];workOrders?:WorkOrder[];moduleData?:Record<string,Record<string,unknown>[]>}
export function AuditPage({records,assets=[],projects=[],drivers=[],workOrders=[],moduleData={}}:Props){
 const [q,setQ]=useState('');const [action,setAction]=useState('');const [source,setSource]=useState('')
 const actions=useMemo(()=>Array.from(new Set(records.map(x=>String(x.action??'')).filter(Boolean))),[records]);const sources=useMemo(()=>Array.from(new Set(records.map(x=>String(x.source??'')).filter(Boolean))),[records]);
 const rows=useMemo(()=>records.filter(r=>(!action||String(r.action)===action)&&(!source||String(r.source)===source)),[records,action,source])
 const searchableText=(r:Record<string,unknown>)=>Object.values(r).map(v=>String(v??'')).join(' ')
 function exportCsv(){const headers=['التاريخ والوقت','المستخدم','العملية','نوع السجل','المرجع','التفاصيل','المصدر'];const esc=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`;const csv='\ufeff'+[headers.map(esc).join(','),...rows.map(r=>[r.ts,r.user,r.action,r.entity,displayReference('ref',r.ref,{assets,projects,drivers,workOrders,records:moduleData}),r.details,r.source].map(esc).join(','))].join('\r\n');const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`KEMEX-audit-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href)}
 return (
  <div className="space-y-6">
    <PageHeader title="سجل التدقيق" description="جميع العمليات الحساسة: المستخدم، العملية، التفاصيل والمصدر — سجل قراءة محمي." action={<Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv}>تصدير CSV</Button>} />
    <div className="grid gap-4 sm:grid-cols-2">
      <MetricCard label="إجمالي الأحداث" value={records.length} icon={ShieldCheck} />
      <MetricCard label="الأحداث المعروضة" value={rows.length} icon={ClipboardPenLine} />
    </div>
    <DataTable
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
      emptyState={<div className="px-6 py-16 text-center text-sm font-medium text-gray-500">لا توجد أحداث مطابقة.</div>}
    />
  </div>
 )
}
function formatDateTime(v:string){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short'}).format(d)}
