import { memo, useDeferredValue, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Columns3, Download, Minus, Search } from 'lucide-react'
import { PrintButton, PrintableDocument } from '../../shared/printing'

export type SortDirection = 'asc' | 'desc'

export interface DataTableColumn<T> {
  id?: string
  key?: string
  header: string
  render?: (row: T) => ReactNode
  sortValue?: (row: T) => string | number | boolean | Date | null | undefined
  accessor?: (row: T) => string | number | boolean | Date | null | undefined
  exportValue?: (row: T) => string | number | boolean | null | undefined
  sortable?: boolean
  mobileVisible?: boolean
  hideOnMobile?: boolean
  searchable?: boolean
  hideable?: boolean
  className?: string
}

export interface DataTableFilter<T> {
  id: string
  label: string
  options: readonly { value: string; label: string }[]
  getValue: (row: T) => string
}

export interface DataTableProps<T> {
  rows: readonly T[]
  columns: readonly DataTableColumn<T>[]
  rowKey: (row: T) => string
  emptyState?: ReactNode
  searchPlaceholder?: string
  pageSize?: number
  pageSizeOptions?: readonly number[]
  searchable?: boolean
  search?: string
  onSearchChange?: (value: string) => void
  searchableText?: (row: T) => string
  filters?: readonly DataTableFilter<T>[]
  initialSort?: { columnId: string; direction?: SortDirection }
  className?: string
  /** Shows the shared KEMEX print action and print-only full dataset. */
  printable?: boolean
  printTitle?: string
  printOrientation?: 'portrait' | 'landscape'
  loading?: boolean
  stickyHeader?: boolean
  enableColumnVisibility?: boolean
  columnVisibilityStorageKey?: string
  enableSelection?: boolean
  selectedRowKeys?: readonly string[]
  onSelectionChange?: (keys: string[]) => void
  bulkActions?: (selectedRows: readonly T[], clearSelection: () => void) => ReactNode
  toolbarActions?: ReactNode
  exportable?: boolean
  exportFileName?: string
  onRowClick?: (row: T) => void
  /** Mobile presentation: auto uses a compact card for narrow datasets and a horizontal table for wide ones. */
  mobilePresentation?: 'auto' | 'cards' | 'table'
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('ar')
}

function columnId<T>(column: DataTableColumn<T>): string {
  return column.id ?? column.key ?? column.header
}

function columnValue<T>(row: T, column: DataTableColumn<T>): unknown {
  if (column.sortValue) return column.sortValue(row)
  if (column.accessor) return column.accessor(row)
  const key = column.id ?? column.key
  if (key && typeof row === 'object' && row !== null) return (row as Record<string, unknown>)[key]
  return ''
}

function exportColumnValue<T>(row: T, column: DataTableColumn<T>): unknown {
  return column.exportValue ? column.exportValue(row) : columnValue(row, column)
}

function renderColumn<T>(row: T, column: DataTableColumn<T>): ReactNode {
  if (column.render) return column.render(row)
  return String(columnValue(row, column) ?? '')
}

function isLikelyActionColumn<T>(column: DataTableColumn<T>): boolean {
  const token = `${columnId(column)} ${column.header}`.toLocaleLowerCase('ar')
  return /action|actions|إجراء|إجراءات|تعديل|خيارات|اختيار|حذف/.test(token)
}

function resolvePrintTitle<T>(exportFileName: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim()
  const token = exportFileName.toLocaleLowerCase('en-US')
  const map: Array<[RegExp, string]> = [
    [/driver/, 'سجل السائقين والمشغلين'],
    [/asset/, 'سجل الأصول والمعدات'],
    [/contract/, 'سجل العقود'],
    [/maintenance|work-order|workorder/, 'سجل أوامر الصيانة'],
    [/breakdown/, 'سجل الأعطال والبلاغات'],
    [/trip|transport/, 'سجل عمليات النقل'],
    [/fuel/, 'سجل عمليات الوقود'],
    [/tire/, 'سجل الإطارات'],
    [/oil/, 'سجل الزيوت'],
    [/purchase/, 'سجل المشتريات وأوامر الشراء'],
    [/inventory|warehouse|stock/, 'سجل المخزون والمستودعات'],
    [/invoice/, 'سجل الفواتير والمستحقات'],
    [/cost/, 'سجل التكاليف'],
    [/project/, 'سجل المشروعات'],
    [/customer|client/, 'سجل العملاء'],
    [/charging/, 'سجل الشحن والتعريفات'],
    [/audit/, 'سجل التدقيق والعمليات'],
    [/user/, 'سجل المستخدمين والصلاحيات'],
    [/notification|alert/, 'سجل التنبيهات'],
  ]
  return map.find(([pattern]) => pattern.test(token))?.[1] ?? 'تقرير بيانات KEMEX'
}

function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a ?? '').localeCompare(String(b ?? ''), 'ar', { numeric: true, sensitivity: 'base' })
}

function safeStorageRead(key: string): Record<string, boolean> | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function csvCell(value: unknown): string {
  const text = String(value ?? '').replace(/\r?\n/g, ' ')
  const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

function downloadCsv<T>(rows: readonly T[], columns: readonly DataTableColumn<T>[], fileName: string) {
  const header = columns.map(column => csvCell(column.header)).join(',')
  const body = rows.map(row => columns.map(column => csvCell(exportColumnValue(row, column))).join(','))
  const blob = new Blob([`\ufeff${[header, ...body].join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function MobileRow<T>({ row, columns, rowKey, selected, onToggle, onClick }: { row: T; columns: readonly DataTableColumn<T>[]; rowKey: (row: T) => string; selected: boolean; onToggle?: (row: T) => void; onClick?: (row: T) => void }) {
  const visibleColumns = columns.filter(column => column.mobileVisible !== false && !column.hideOnMobile)
  const [primary, ...rest] = visibleColumns

  return (
    <article className={`ui-data-table__mobile-card ${onClick ? 'is-clickable' : ''}`.trim()} onClick={() => onClick?.(row)} onKeyDown={event => { if (onClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(row) } }} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="ui-data-table__mobile-heading">
        {onToggle && <button type="button" className="ui-data-table__selection-button" aria-label={selected ? 'إلغاء تحديد السجل' : 'تحديد السجل'} aria-pressed={selected} onClick={event => { event.stopPropagation(); onToggle(row) }}>{selected ? <Check size={15} /> : null}</button>}
        {primary && <div className="ui-data-table__mobile-title">{renderColumn(row, primary)}</div>}
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rest.map(column => (
          <div key={columnId(column)} className="ui-data-table__mobile-field">
            <dt className="ui-data-table__mobile-label">{column.header}</dt>
            <dd className="ui-data-table__mobile-value">{renderColumn(row, column)}</dd>
          </div>
        ))}
      </dl>
      <span className="sr-only">معرّف السجل {rowKey(row)}</span>
    </article>
  )
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyState,
  searchPlaceholder = 'بحث في البيانات...',
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  searchableText,
  filters = [],
  initialSort,
  searchable = true,
  search,
  onSearchChange,
  className = '',
  printable = true,
  printTitle,
  printOrientation,
  loading = false,
  stickyHeader = true,
  enableColumnVisibility = false,
  columnVisibilityStorageKey,
  enableSelection = false,
  selectedRowKeys,
  onSelectionChange,
  bulkActions,
  toolbarActions,
  exportable = false,
  exportFileName = 'kemex-export',
  onRowClick,
  mobilePresentation = 'auto',
}: DataTableProps<T>) {
  const [internalQuery, setInternalQuery] = useState('')
  const query = search ?? internalQuery
  const deferredQuery = useDeferredValue(query)
  const [page, setPage] = useState(1)
  const [currentPageSize, setCurrentPageSize] = useState(pageSize)
  const [sort, setSort] = useState<{ columnId: string; direction: SortDirection } | null>(initialSort ? { columnId: initialSort.columnId, direction: initialSort.direction ?? 'asc' } : null)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [showColumns, setShowColumns] = useState(false)
  const [internalSelected, setInternalSelected] = useState<string[]>([])
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(columns.map(column => [columnId(column), true]))
    if (!columnVisibilityStorageKey || typeof window === 'undefined') return defaults
    const saved = safeStorageRead(columnVisibilityStorageKey)
    return saved ? { ...defaults, ...saved } : defaults
  })

  const selectedKeys = selectedRowKeys ?? internalSelected
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])

  useEffect(() => {
    if (!columnVisibilityStorageKey) return
    try { window.localStorage.setItem(columnVisibilityStorageKey, JSON.stringify(visibleMap)) } catch { /* storage is optional */ }
  }, [columnVisibilityStorageKey, visibleMap])

  const visibleColumns = useMemo(() => columns.filter(column => visibleMap[columnId(column)] !== false), [columns, visibleMap])
  const mobileColumns = useMemo(() => visibleColumns.filter(column => column.mobileVisible !== false && !column.hideOnMobile), [visibleColumns])
  const useMobileTable = mobilePresentation === 'table' || (mobilePresentation === 'auto' && mobileColumns.length > 5)

  const filteredRows = useMemo(() => {
    const searchFields = visibleColumns.filter(column => column.searchable !== false)
    const normalizedQuery = normalize(deferredQuery)
    return rows.filter(row => {
      const searchText = searchableText ? searchableText(row) : searchFields.map(column => String(columnValue(row, column) ?? '')).join(' ')
      const matchesQuery = !normalizedQuery || normalize(searchText).includes(normalizedQuery)
      const matchesFilters = filters.every(filter => {
        const selected = filterValues[filter.id]
        return !selected || filter.getValue(row) === selected
      })
      return matchesQuery && matchesFilters
    })
  }, [deferredQuery, filters, filterValues, rows, searchableText, visibleColumns])

  const sortedRows = useMemo(() => {
    if (!sort) return [...filteredRows]
    const column = columns.find(item => columnId(item) === sort.columnId)
    if (!column) return [...filteredRows]
    return [...filteredRows].sort((a, b) => {
      const result = compareValues(columnValue(a, column), columnValue(b, column))
      return sort.direction === 'asc' ? result : -result
    })
  }, [columns, filteredRows, sort])

  const printInstanceId = useId().replace(/:/g, '')
  const printId = `kemex-table-print-${printInstanceId}`
  const effectivePageSize = Math.max(1, currentPageSize)
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / effectivePageSize))
  const safePage = Math.min(page, pageCount)
  const visibleRows = sortedRows.slice((safePage - 1) * effectivePageSize, safePage * effectivePageSize)
  const allFilteredSelected = sortedRows.length > 0 && sortedRows.every(row => selectedSet.has(rowKey(row)))
  const someFilteredSelected = sortedRows.some(row => selectedSet.has(rowKey(row)))
  const selectedRows = useMemo(() => rows.filter(row => selectedSet.has(rowKey(row))), [rowKey, rows, selectedSet])

  useEffect(() => { setPage(1) }, [query, filterValues, currentPageSize])

  function commitSelection(keys: string[]) {
    const unique = Array.from(new Set(keys))
    if (selectedRowKeys === undefined) setInternalSelected(unique)
    onSelectionChange?.(unique)
  }

  function toggleRow(row: T) {
    const key = rowKey(row)
    commitSelection(selectedSet.has(key) ? selectedKeys.filter(item => item !== key) : [...selectedKeys, key])
  }

  function toggleFilteredSelection() {
    if (allFilteredSelected) {
      const blocked = new Set(sortedRows.map(row => rowKey(row)))
      commitSelection(selectedKeys.filter(key => !blocked.has(key)))
      return
    }
    commitSelection([...selectedKeys, ...sortedRows.map(row => rowKey(row))])
  }

  function clearSelection() { commitSelection([]) }

  function changeSort(column: DataTableColumn<T>) {
    if (column.sortable === false) return
    if (!column.sortValue && !column.accessor && !(column.id ?? column.key)) return
    const id = columnId(column)
    setSort(current => !current || current.columnId !== id ? { columnId: id, direction: 'asc' } : { columnId: id, direction: current.direction === 'asc' ? 'desc' : 'asc' })
    setPage(1)
  }

  if (loading) return <section className={`ui-data-table ${className}`.trim()} aria-busy="true"><div className="ui-data-table__loading"><div /><div /><div /><div /></div></section>

  return (
    <section className={`ui-data-table flex flex-col overflow-hidden ${className}`.trim()}>
      <div className="ui-data-table__toolbar flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="ui-data-table__search-wrap relative min-w-0 flex-1 sm:min-w-[240px]">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <span className="sr-only">البحث</span>
          <input disabled={!searchable} value={query} onChange={event => { onSearchChange?.(event.target.value); if (search === undefined) setInternalQuery(event.target.value); setPage(1) }} placeholder={searchPlaceholder} inputMode="search" aria-label={searchPlaceholder} className="ui-data-table__search w-full" />
        </label>

        {filters.map(filter => (
          <label key={filter.id} className="ui-data-table__filter-wrap flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[170px] sm:flex-none">
            <span className="ui-data-table__filter-label">{filter.label}</span>
            <select value={filterValues[filter.id] ?? ''} onChange={event => { const value = event.target.value; setFilterValues(current => ({ ...current, [filter.id]: value })); setPage(1) }} className="ui-data-table__filter">
              <option value="">الكل</option>
              {filter.options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}

        <div className="ui-data-table__toolbar-actions">
          <span className="ui-data-table__count">{filteredRows.length} سجل</span>
          {enableColumnVisibility && <div className="ui-data-table__menu-wrap">
            <button type="button" className={`ui-data-table__tool-button ${showColumns ? 'is-active' : ''}`} onClick={() => setShowColumns(value => !value)} aria-expanded={showColumns}><Columns3 size={15} /> الأعمدة</button>
            {showColumns && <div className="ui-data-table__column-menu" role="menu">
              {columns.filter(column => column.hideable !== false).map(column => {
                const id = columnId(column)
                const checked = visibleMap[id] !== false
                return <label key={id} className="ui-data-table__column-option"><input type="checkbox" checked={checked} onChange={() => setVisibleMap(current => {
                  const visibleCount = Object.values(current).filter(Boolean).length
                  if (checked && visibleCount <= 1) return current
                  return { ...current, [id]: !checked }
                })} /><span>{column.header}</span></label>
              })}
            </div>}
          </div>}
          {exportable && <button type="button" className="ui-data-table__tool-button" onClick={() => downloadCsv(sortedRows, visibleColumns, exportFileName)}><Download size={15} /> تصدير</button>}
          {printable && <PrintButton printId={printId} documentTitle={resolvePrintTitle(exportFileName, printTitle)} label="طباعة" disabled={!sortedRows.length} className="ui-data-table__print-button" />}
          {toolbarActions}
        </div>
      </div>

      {enableSelection && <div className="ui-data-table__selection-toolbar">
        <label className="ui-data-table__select-all">
          <input type="checkbox" checked={allFilteredSelected} ref={input => { if (input) input.indeterminate = !allFilteredSelected && someFilteredSelected }} onChange={toggleFilteredSelection} />
          <span>{someFilteredSelected ? `تم تحديد ${selectedRows.length}` : 'تحديد النتائج'}</span>
        </label>
        {selectedRows.length > 0 && <>{bulkActions?.(selectedRows, clearSelection)}<button type="button" className="ui-data-table__clear-selection" onClick={clearSelection}>إلغاء التحديد</button></>}
      </div>}

      {visibleRows.length ? (
        <>
          <div className="ui-data-table__desktop overflow-x-auto">
            <table aria-label="جدول البيانات" className={`ui-data-table__table w-full text-right ${stickyHeader ? 'is-sticky-header' : ''}`.trim()}>
              <thead className="ui-data-table__thead">
                <tr className="divide-x divide-x-reverse divide-gray-100">
                  {enableSelection && <th scope="col" className="ui-data-table__selection-col"><span className="sr-only">تحديد</span></th>}
                  {visibleColumns.map(column => {
                    const id = columnId(column)
                    const active = sort?.columnId === id
                    const canSort = column.sortable !== false && (Boolean(column.sortValue) || Boolean(column.accessor) || Boolean(column.id ?? column.key))
                    return <th key={id} scope="col" aria-sort={canSort && active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : canSort ? 'none' : undefined} className={`px-6 py-4 text-sm font-semibold text-slate-700 ${column.className ?? ''}`}>
                      <button type="button" disabled={!canSort} onClick={() => changeSort(column)} className={`inline-flex items-center gap-1.5 text-right ${canSort ? 'cursor-pointer hover:text-primary-700' : 'cursor-default'}`}>
                        <span>{column.header}</span>{canSort && active && (sort?.direction === 'asc' ? <ChevronUp size={15} /> : <ChevronDown size={15} />)}
                      </button>
                    </th>
                  })}
                </tr>
              </thead>
              <tbody className="ui-data-table__tbody">
                {visibleRows.map(row => {
                  const key = rowKey(row); const selected = selectedSet.has(key)
                  return <tr key={key} className={`ui-data-table__row transition-colors ${selected ? 'is-selected' : ''} ${onRowClick ? 'is-clickable' : ''}`.trim()} onClick={() => onRowClick?.(row)} onKeyDown={event => { if (onRowClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onRowClick(row) } }} tabIndex={onRowClick ? 0 : undefined}>
                    {enableSelection && <td className="ui-data-table__selection-col" onClick={event => event.stopPropagation()}><button type="button" className="ui-data-table__selection-button" aria-label={selected ? 'إلغاء تحديد السجل' : 'تحديد السجل'} aria-pressed={selected} onClick={() => toggleRow(row)}>{selected ? <Check size={14} /> : null}</button></td>}
                    {visibleColumns.map(column => <td key={columnId(column)} className={`ui-data-table__td align-middle ${column.className ?? ''}`}>{renderColumn(row, column)}</td>)}
                  </tr>
                })}
              </tbody>
            </table>
          </div>

          {useMobileTable ? (
            <div className="ui-data-table__mobile ui-data-table__mobile--table">
              <div className="ui-data-table__mobile-table-wrap">
                <table aria-label="جدول البيانات على الهاتف" className="ui-data-table__mobile-table">
                  <thead>
                    <tr>
                      {enableSelection && <th className="ui-data-table__selection-col"><span className="sr-only">تحديد</span></th>}
                      {visibleColumns.map(column => <th key={columnId(column)} scope="col">{column.header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(row => {
                      const key = rowKey(row)
                      const selected = selectedSet.has(key)
                      return <tr key={key} className={`${selected ? 'is-selected' : ''} ${onRowClick ? 'is-clickable' : ''}`.trim()} onClick={event => {
                        const target = event.target as HTMLElement
                        if (target.closest('button,a,input,select,textarea')) return
                        onRowClick?.(row)
                      }} onKeyDown={event => { if (onRowClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onRowClick(row) } }} tabIndex={onRowClick ? 0 : undefined}>
                        {enableSelection && <td className="ui-data-table__selection-col" onClick={event => event.stopPropagation()}><button type="button" className="ui-data-table__selection-button" aria-label={selected ? 'إلغاء تحديد السجل' : 'تحديد السجل'} aria-pressed={selected} onClick={() => toggleRow(row)}>{selected ? <Check size={14} /> : null}</button></td>}
                        {mobileColumns.map((column, index) => <td key={columnId(column)} className={index === 0 ? 'ui-data-table__mobile-sticky-cell' : undefined}>{renderColumn(row, column)}</td>)}
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="ui-data-table__mobile ui-data-table__mobile--cards grid gap-3">
              {visibleRows.map(row => <MobileRow key={rowKey(row)} row={row} columns={visibleColumns} rowKey={rowKey} selected={selectedSet.has(rowKey(row))} onToggle={enableSelection ? toggleRow : undefined} onClick={onRowClick} />)}
            </div>
          )}
        </>
      ) : emptyState ?? <div className="ui-data-table__empty">لا توجد سجلات مطابقة.</div>}

      {printable && sortedRows.length > 0 && (
        <PrintableDocument
          printId={printId}
          documentTitle={resolvePrintTitle(exportFileName, printTitle)}
          orientation={printOrientation ?? (visibleColumns.filter(column => !isLikelyActionColumn(column)).length > 7 ? 'landscape' : 'portrait')}
          meta={[
            { label: 'عدد السجلات', value: sortedRows.length },
            { label: 'تاريخ الطباعة', value: new Date().toISOString().slice(0, 10) },
            { label: 'البحث / الفلاتر', value: query || 'بدون' },
          ]}
          signatures={[{ label: 'إعداد المستند' }, { label: 'مراجعة' }, { label: 'اعتماد' }]}
          footerNote="نسخة مطبوعة من بيانات KEMEX — تم إنشاء هذا المستند من السجلات المعروضة بعد تطبيق البحث والفلاتر والترتيب الحالي."
        >
          <div className="print-section-title">بيانات السجل</div>
          <div className="kemex-print-report-table-wrap">
            <table>
              <thead>
                <tr>
                  {visibleColumns.filter(column => !isLikelyActionColumn(column)).map(column => <th key={columnId(column)}>{column.header}</th>)}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(row => <tr key={rowKey(row)}>
                  {visibleColumns.filter(column => !isLikelyActionColumn(column)).map(column => <td key={columnId(column)}>{renderColumn(row, column)}</td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
        </PrintableDocument>
      )}

      <footer className="ui-data-table__footer flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="ui-data-table__footer-meta"><span>{filteredRows.length} نتيجة</span>{sortedRows.length > effectivePageSize && <><span>·</span><span>صفحة {safePage} من {pageCount}</span></>}</div>
        <div className="ui-data-table__footer-controls">
          <label className="ui-data-table__page-size">عرض <select value={currentPageSize} onChange={event => setCurrentPageSize(Number(event.target.value))}>{pageSizeOptions.map(size => <option key={size} value={size}>{size}</option>)}</select></label>
          <div className="ui-data-table__footer-actions">
            <button type="button" className="ui-data-table__footer-button" disabled={safePage <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}><ChevronRight size={15}/> السابق</button>
            <button type="button" className="ui-data-table__footer-button" disabled={safePage >= pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>التالي <ChevronLeft size={15}/></button>
          </div>
        </div>
      </footer>
    </section>
  )
}
