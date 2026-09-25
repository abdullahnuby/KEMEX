import { useEffect, useMemo, useRef, useState } from 'react'
import { ArchiveRestore, CloudDownload, DatabaseBackup, Download, FileSpreadsheet, RefreshCw, ShieldCheck, Upload } from 'lucide-react'
import type { User } from '../types/tfms'
import { Button, Card, PageHeader } from '../components/ui'
import { labelForTable, guessHeaderMapping, normalizeHeader, tableExportColumns, type DataColumn, type DataTable } from '../features/dataManagement/catalog'
import { downloadBlob, readExcelFile, workbookBlob, type SheetData } from '../features/dataManagement/excel'
import { exportDatabaseBackup, exportTable, importTableRows, getDataCatalog, parseBackup, registerBackup, type KemexBackup } from '../services/dataManagementService'

type Props = { user: User }

function errorText(error: unknown) { return error instanceof Error ? error.message : String(error ?? 'حدث خطأ غير معروف.') }

function excelSerialToDate(serial: number, withTime: boolean) {
  const milliseconds = Math.round((serial - 25569) * 86400 * 1000)
  const date = new Date(milliseconds)
  if (!Number.isFinite(date.getTime())) return serial
  return withTime ? date.toISOString() : date.toISOString().slice(0, 10)
}

function normalizeImportedValue(value: unknown, column: DataColumn) {
  if (value === '' || value === null || value === undefined) return null
  const type = column.type
  if (['integer', 'bigint', 'numeric', 'double precision', 'real', 'decimal'].includes(type)) {
    const numeric = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim())
    if (!Number.isFinite(numeric)) throw new Error(`القيمة "${String(value)}" غير رقمية للحقل ${column.name}.`)
    return numeric
  }
  if (type === 'boolean') {
    const normalized = String(value).trim().toLowerCase()
    if (value === true || normalized === 'true' || normalized === '1' || normalized === 'نعم' || normalized === 'نشط') return true
    if (value === false || normalized === 'false' || normalized === '0' || normalized === 'لا' || normalized === 'غير نشط') return false
    throw new Error(`القيمة "${String(value)}" غير صالحة كقيمة منطقية للحقل ${column.name}.`)
  }
  if (type === 'json' || type === 'jsonb') {
    if (typeof value === 'object') return value
    const text = String(value).trim()
    try { return JSON.parse(text) } catch { throw new Error(`JSON غير صالح في الحقل ${column.name}.`) }
  }
  if (type === 'date' && typeof value === 'number') return excelSerialToDate(value, false)
  if (type.includes('timestamp') && typeof value === 'number') return excelSerialToDate(value, true)
  return String(value)
}

function buildMappedRows(sheet: SheetData, mapping: Record<string, string>, columns: DataColumn[]) {
  const byName = new Map(columns.map(column => [column.name, column]))
  return sheet.rows.map(sourceRow => {
    const targetRow: Record<string, unknown> = {}
    for (const sourceHeader of sheet.headers) {
      const target = mapping[sourceHeader]
      if (!target) continue
      const column = byName.get(target)
      if (!column) continue
      targetRow[target] = normalizeImportedValue(sourceRow[sourceHeader], column)
    }
    return targetRow
  }).filter(row => Object.keys(row).length > 0)
}

function ColumnMap({ headers, columns, mapping, onChange }: { headers: string[]; columns: DataColumn[]; mapping: Record<string, string>; onChange: (source: string, target: string) => void }) {
  return <div className="dm-mapping-list">{headers.map(header => <div className="dm-mapping-row" key={header}>
    <strong>{header}</strong>
    <span>←</span>
    <select value={mapping[header] ?? ''} onChange={event => onChange(header, event.target.value)}>
      <option value="">تجاهل العمود</option>
      {columns.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}
    </select>
  </div>)}</div>
}

export function DataManagementPage({ user }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)
  const pendingImportTableRef = useRef<DataTable | null>(null)
  const [tables, setTables] = useState<DataTable[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTableName, setSelectedTableName] = useState('')
  const [activeTab, setActiveTab] = useState<'excel' | 'backup'>('excel')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedSheet, setSelectedSheet] = useState<SheetData | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [backupPreview, setBackupPreview] = useState<KemexBackup | null>(null)
  const [backupProgress, setBackupProgress] = useState('')

  const selectedTable = tables.find(table => table.table_name === selectedTableName) ?? null
  const visibleColumns = useMemo(() => selectedTable?.columns.slice().sort((a, b) => a.ordinal - b.ordinal) ?? [], [selectedTable])

  useEffect(() => {
    let active = true
    setLoading(true)
    getDataCatalog().then(catalog => {
      if (!active) return
      setTables(catalog)
      setSelectedTableName(catalog.find(table => table.importable)?.table_name ?? catalog[0]?.table_name ?? '')
    }).catch(e => { if (active) setError(errorText(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function resetFeedback() { setMessage(''); setError('') }

  async function downloadTemplate() {
    if (!selectedTable) return
    resetFeedback(); setBusy(true)
    try {
      const headers = tableExportColumns(selectedTable)
      const blob = workbookBlob([{ name: selectedTable.table_name, headers, rows: [] }])
      downloadBlob(blob, `KEMEX-template-${selectedTable.table_name}.xlsx`)
      setMessage(`تم تنزيل قالب ${labelForTable(selectedTable.table_name)}.`)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  async function downloadSingleTable(tableOverride?: DataTable) {
    const targetTable = tableOverride ?? selectedTable
    if (!targetTable) return
    resetFeedback(); setBusy(true)
    try {
      const rows = await exportTable(targetTable)
      const headers = tableExportColumns(targetTable)
      downloadBlob(workbookBlob([{ name: targetTable.table_name, headers, rows }]), `KEMEX-${targetTable.table_name}.xlsx`)
      setMessage(`تم تصدير ${rows.length} سجلًا من ${labelForTable(targetTable.table_name)}.`)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  async function downloadAllTablesExcel() {
    resetFeedback(); setBusy(true); setBackupProgress('')
    try {
      const sheets: SheetData[] = []
      for (let index = 0; index < tables.length; index++) {
        const table = tables[index]
        setBackupProgress(`جارٍ تصدير ${index + 1} من ${tables.length}: ${labelForTable(table.table_name)}`)
        const rows = await exportTable(table)
        sheets.push({ name: table.table_name, headers: tableExportColumns(table), rows })
      }
      downloadBlob(workbookBlob(sheets), `KEMEX-all-tables-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setMessage(`تم إنشاء ملف Excel موحد يحتوي على ${sheets.length} جدولًا.`)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false); setBackupProgress('') }
  }

  async function handleExcelFile(file: File, tableOverride?: DataTable | null) {
    const targetTable = tableOverride ?? pendingImportTableRef.current ?? selectedTable
    pendingImportTableRef.current = null
    if (!targetTable) return
    resetFeedback(); setBusy(true)
    try {
      const sheets = await readExcelFile(file)
      const sheet = sheets[0]
      if (!sheet || !sheet.headers.length) throw new Error('لم يتم العثور على صف عناوين في ملف Excel.')
      setSelectedTableName(targetTable.table_name)
      setSelectedSheet(sheet)
      const targetColumns = targetTable.columns.slice().sort((a, b) => a.ordinal - b.ordinal)
      setMapping(guessHeaderMapping(sheet.headers, targetColumns))
      setMessage(`تمت قراءة ${sheet.rows.length} سجلًا من الورقة ${sheet.name}. راجع مطابقة الأعمدة قبل الاستيراد.`)
    } catch (e) { setError(errorText(e)); setSelectedSheet(null) } finally { setBusy(false) }
  }

  async function commitImport() {
    if (!selectedTable || !selectedTable.importable || !selectedSheet) return
    resetFeedback(); setBusy(true)
    try {
      const rows = buildMappedRows(selectedSheet, mapping, visibleColumns)
      if (!rows.length) throw new Error('لا توجد أعمدة مطابقة للاستيراد.')
      const pk = selectedTable.primary_key
      const missing = rows.findIndex(row => pk.some(key => row[key] === null || row[key] === undefined || row[key] === ''))
      if (missing >= 0) throw new Error(`السجل رقم ${missing + 2} يفتقد المفتاح الأساسي المطلوب: ${pk.join(', ')}.`)
      await importTableRows(selectedTable.table_name, rows, 'upsert', processed => setMessage(`جارٍ استيراد ${processed} من ${rows.length} سجلًا...`))
      await registerBackup('manual', `excel-import:${selectedTable.table_name}`, 'captured', `Excel import ${rows.length} rows`)
      setMessage(`تم استيراد ${rows.length} سجلًا في ${labelForTable(selectedTable.table_name)} بنجاح.`)
      setSelectedSheet(null)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  async function createBackup() {
    resetFeedback(); setBusy(true); setBackupProgress('بدء النسخة الاحتياطية...')
    try {
      const backup = await exportDatabaseBackup(tables, (name, index, total, rowCount) => setBackupProgress(`الجدول ${index}/${total}: ${labelForTable(name)} — ${rowCount} سجل`))
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json;charset=utf-8' })
      const filename = `KEMEX-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.kemex-backup.json`
      downloadBlob(blob, filename)
      await registerBackup('manual', filename, 'captured', 'Logical public-schema backup generated from the application')
      setMessage(`تم إنشاء نسخة احتياطية من ${tables.length} جدولًا وتنزيلها على جهازك.`)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false); setBackupProgress('') }
  }

  async function readBackup(file: File) {
    resetFeedback(); setBusy(true)
    try {
      const parsed = parseBackup(JSON.parse(await file.text()))
      setBackupPreview(parsed)
      const imported = Object.entries(parsed.tables).filter(([name]) => tables.find(table => table.table_name === name)?.importable).length
      setMessage(`تمت قراءة النسخة. تحتوي على ${Object.keys(parsed.tables).length} جدولًا، منها ${imported} جدولًا قابلًا للاستعادة.`)
    } catch (e) { setError(errorText(e)); setBackupPreview(null) } finally { setBusy(false) }
  }

  async function restoreBackup() {
    if (!backupPreview) return
    const importableEntries = Object.entries(backupPreview.tables).filter(([name]) => tables.find(table => table.table_name === name)?.importable)
    if (!importableEntries.length) { setError('لا توجد جداول قابلة للاستعادة في النسخة.'); return }
    if (!window.confirm('سيتم دمج البيانات الموجودة في النسخة مع قاعدة البيانات الحالية باستخدام المفتاح الأساسي. لن يتم حذف البيانات الحالية. يوصى بأخذ نسخة حالية أولًا. هل تريد المتابعة؟')) return
    resetFeedback(); setBusy(true)
    try {
      const restoreOrder = [
        'asset_categories','asset_types','clients','contracts','cost_centers','projects','warehouses','drivers',
        'assets','assignments','project_memberships','inventory_items','breakdown_events','work_orders',
        'downtime_tracking','charging_rates','fuel_operations','operations','cost_entries','maintenance_technicians',
        'maintenance_parts','maintenance_cost_items','maintenance_transports','stock_movements','trips','trip_costs',
        'trip_exceptions','trip_execution_events','trip_geofence_events','trip_geofence_overrides','trip_permits','trip_receipts',
        'asset_documents','tfms_module_records'
      ]
      const rank = new Map(restoreOrder.map((name, index) => [name, index]))
      const ordered = importableEntries.slice().sort(([a], [b]) => (rank.get(a) ?? 9999) - (rank.get(b) ?? 9999))
      let completedTables = 0
      const pending = ordered.slice()
      let lastError: unknown = null

      while (pending.length) {
        let progress = false
        for (let index = 0; index < pending.length;) {
          const [tableName, rows] = pending[index]
          setBackupProgress(`استعادة ${completedTables + 1}/${ordered.length}: ${labelForTable(tableName)}`)
          try {
            await importTableRows(tableName, rows, 'upsert')
            pending.splice(index, 1)
            completedTables += 1
            progress = true
          } catch (e) {
            lastError = e
            index += 1
          }
        }
        if (!progress) break
      }

      if (pending.length) {
        const failedTables = pending.map(([name]) => labelForTable(name)).join('، ')
        throw new Error(`تعذر استعادة بعض الجداول بسبب قيود بيانات مترابطة: ${failedTables}. ${errorText(lastError)}`)
      }

      await registerBackup('restore_point', `restore:${backupPreview.created_at}`, 'restored', 'Logical application data restore completed')
      setMessage(`تمت استعادة ${completedTables} جدولًا بنظام الدمج (Upsert) دون حذف البيانات الحالية.`)
      setBackupPreview(null)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false); setBackupProgress('') }
  }

  if (user.role !== 'admin') return <Card><div className="global-error">إدارة استيراد وتصدير البيانات متاحة لمدير النظام فقط.</div></Card>

  return <div className="space-y-6 data-management-page">
    <PageHeader title="إدارة البيانات" description="استيراد وتصدير جميع جداول KEMEX إلى Excel، وإنشاء نسخ احتياطية من بيانات قاعدة البيانات واستعادتها بأمان." />

    <div className="dm-tabs">
      <button className={activeTab === 'excel' ? 'active' : ''} onClick={() => setActiveTab('excel')}><FileSpreadsheet size={17}/> Excel والاستيراد</button>
      <button className={activeTab === 'backup' ? 'active' : ''} onClick={() => setActiveTab('backup')}><DatabaseBackup size={17}/> النسخ الاحتياطي والاستعادة</button>
    </div>

    {(message || error) && <div className={error ? 'global-error' : 'form-success'} role="status">{error || message}</div>}
    {backupProgress && <div className="dm-progress"><RefreshCw size={15} className="spin"/> {backupProgress}</div>}

    {activeTab === 'excel' && <>
      <Card>
        <div className="dm-card-head"><div><strong>استيراد / تصدير Excel</strong><span>اختر أي جدول، نزّل القالب، عبّئ البيانات القديمة ثم استوردها. الاستيراد يستخدم المفتاح الأساسي للتحديث دون تكرار.</span></div><ShieldCheck size={24}/></div>
        <div className="dm-toolbar">
          <label className="field"><span>الجدول</span><select value={selectedTableName} onChange={event => { setSelectedTableName(event.target.value); setSelectedSheet(null); resetFeedback() }} disabled={loading || busy}>{tables.map(table => <option key={table.table_name} value={table.table_name}>{labelForTable(table.table_name)} — {table.table_name}{table.importable ? '' : ' — تصدير فقط'}</option>)}</select></label>
          <div className="dm-actions">
            <Button icon={<Download size={15}/>} onClick={downloadTemplate} disabled={!selectedTable || busy}>قالب Excel</Button>
            <Button icon={<CloudDownload size={15}/>} onClick={() => void downloadSingleTable()} disabled={!selectedTable || busy} loading={busy}>تصدير الجدول</Button>
            <Button icon={<Upload size={15}/>} onClick={() => { pendingImportTableRef.current = selectedTable; inputRef.current?.click() }} disabled={!selectedTable?.importable || busy}>استيراد Excel</Button>
            <input ref={inputRef} type="file" accept=".xlsx,.csv" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void handleExcelFile(file, pendingImportTableRef.current); event.currentTarget.value = '' }} />
          </div>
        </div>
        <div className="dm-info-grid"><div><b>{tables.length}</b><span>إجمالي الجداول</span></div><div><b>{tables.filter(table => table.importable).length}</b><span>جداول قابلة للاستيراد</span></div><div><b>{tables.filter(table => !table.importable).length}</b><span>جداول تصدير فقط</span></div><div><b>{visibleColumns.length}</b><span>أعمدة الجدول المختار</span></div></div><div className="dm-note-inline">الجداول النظامية والرقابية تظهر للتصدير والاحتفاظ بها، لكن لا تسمح الواجهة باستيرادها مباشرة حتى لا تتأثر المصادقة وسجلات التدقيق.</div>
      </Card>

      {selectedSheet && selectedTable && <Card>
        <div className="dm-card-head"><div><strong>مراجعة ملف Excel</strong><span>{selectedSheet.name} — {selectedSheet.rows.length} سجل. اختر الحقل المقابل لكل عمود قبل التنفيذ.</span></div></div>
        <ColumnMap headers={selectedSheet.headers} columns={visibleColumns} mapping={mapping} onChange={(source, target) => setMapping(current => ({ ...current, [source]: target }))}/>
        <div className="dm-preview"><strong>معاينة</strong>{selectedSheet.rows.slice(0, 6).map((row, index) => <div className="dm-preview-row" key={index}>{selectedSheet.headers.slice(0, 6).map(header => <span key={header}><b>{header}</b>{String(row[header] ?? '')}</span>)}</div>)}</div>
        <div className="modal-actions"><Button icon={<Upload size={15}/>} onClick={commitImport} disabled={busy || !selectedTable.importable} loading={busy}>تنفيذ الاستيراد</Button></div>
      </Card>}

      <Card>
        <div className="dm-card-head"><div><strong>تصدير شامل</strong><span>ينشئ ملف Excel واحدًا يحتوي على ورقة لكل جدول، بما في ذلك جداول النظام للقراءة والاحتفاظ بها.</span></div></div>
        <Button icon={<Download size={15}/>} onClick={downloadAllTablesExcel} disabled={busy || loading} loading={busy}>تصدير كل الجداول إلى Excel</Button>
      </Card>

      <Card>
        <div className="dm-table-list">{tables.map(table => <div className="dm-table-card" key={table.table_name}>
          <div><strong>{labelForTable(table.table_name)}</strong><small>{table.table_name} · {table.columns.length} أعمدة · {table.data_class === 'business' ? 'بيانات تشغيلية' : table.data_class === 'projection' ? 'بيانات مشتقة' : 'بيانات نظام'}</small></div>
          <div className="dm-table-actions"><Button icon={<Download size={14}/>} onClick={() => { setSelectedTableName(table.table_name); void downloadSingleTable(table) }} disabled={busy}>تصدير</Button>{table.importable && <Button icon={<Upload size={14}/>} onClick={() => { setSelectedTableName(table.table_name); pendingImportTableRef.current = table; inputRef.current?.click() }} disabled={busy}>استيراد</Button>}</div>
        </div>)}</div>
      </Card>
    </>}

    {activeTab === 'backup' && <>
      <Card>
        <div className="dm-card-head"><div><strong>نسخة احتياطية من قاعدة البيانات</strong><span>النسخة منطقية وتشمل جميع جداول public وبياناتها. لا تشمل ملفات Storage الثنائية نفسها.</span></div><ArchiveRestore size={24}/></div>
        <div className="dm-warning">قبل أي استعادة، خذ نسخة جديدة من الحالة الحالية. الاستعادة المتاحة هنا غير مدمرة: تضيف أو تحدّث السجلات بالمفتاح الأساسي ولا تحذف السجلات الحالية.</div>
        <div className="dm-actions"><Button icon={<DatabaseBackup size={15}/>} onClick={createBackup} disabled={busy || loading} loading={busy}>إنشاء نسخة احتياطية الآن</Button><Button icon={<ArchiveRestore size={15}/>} onClick={() => backupRef.current?.click()} disabled={busy}>اختيار نسخة للاستعادة</Button><input ref={backupRef} type="file" accept=".json,.kemex-backup.json" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void readBackup(file); event.currentTarget.value = '' }} /></div>
      </Card>

      {backupPreview && <Card>
        <div className="dm-card-head"><div><strong>محتوى النسخة</strong><span>تاريخ النسخة: {new Date(backupPreview.created_at).toLocaleString('ar-EG')}</span></div></div>
        <div className="dm-info-grid">{Object.entries(backupPreview.tables).map(([name, rows]) => <div key={name}><b>{rows.length}</b><span>{labelForTable(name)}{!tables.find(table => table.table_name === name)?.importable && ' — محمي'}</span></div>)}</div>
        <div className="modal-actions"><Button icon={<ArchiveRestore size={15}/>} onClick={restoreBackup} disabled={busy} loading={busy}>استعادة البيانات</Button></div>
      </Card>}

      <Card>
        <div className="dm-card-head"><div><strong>ما يتم نسخه وما لا يتم استعادته</strong><span>جداول التدقيق والحسابات والمرفقات ومسارات النظام تُنسخ للرجوع إليها، لكن لا تُستورد مباشرة حتى لا تتأثر سلامة المصادقة والسجل الرقابي.</span></div></div>
        <ul className="dm-note-list"><li>ملفات Storage لا تدخل داخل ملف النسخة؛ يتم حفظ بياناتها الوصفية فقط.</li><li>حسابات Supabase Auth نفسها لا تُنشأ من ملف النسخة. ملفات profiles محمية.</li><li>أوامر الشراء والفواتير يتم الحفاظ على مصدرها التشغيلي، لذلك لا تُستورد إسقاطاتها مباشرة.</li></ul>
      </Card>
    </>}
  </div>
}
