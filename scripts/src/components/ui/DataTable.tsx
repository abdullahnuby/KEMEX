import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'

export type SortDirection = 'asc' | 'desc'

export interface DataTableColumn<T> {
  id?: string
  key?: string
  header: string
  render?: (row: T) => ReactNode
  sortValue?: (row: T) => string | number | boolean | Date | null | undefined
  accessor?: (row: T) => string | number | boolean | Date | null | undefined
  sortable?: boolean
  mobileVisible?: boolean
  hideOnMobile?: boolean
  searchable?: boolean
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
  searchable?: boolean
  search?: string
  onSearchChange?: (value: string) => void
  searchableText?: (row: T) => string
  filters?: readonly DataTableFilter<T>[]
  initialSort?: { columnId: string; direction?: SortDirection }
  className?: string
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
  if (key && typeof row === 'object' && row !== null) {
    return (row as Record<string, unknown>)[key]
  }
  return ''
}

function renderColumn<T>(row: T, column: DataTableColumn<T>): ReactNode {
  if (column.render) return column.render(row)
  return String(columnValue(row, column) ?? '')
}

function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a ?? '').localeCompare(String(b ?? ''), 'ar', { numeric: true, sensitivity: 'base' })
}

function SkeletonRows({ columns, count }: { columns: number; count: number }) {
  return Array.from({ length: count }).map((_, rowIndex) => (
    <tr key={`skeleton-${rowIndex}`}>
      {Array.from({ length: columns }).map((__, cellIndex) => (
        <td key={`skeleton-${rowIndex}-${cellIndex}`} className="ui-data-table__skeleton-cell">
          <div className="ui-data-table__skeleton" />
        </td>
      ))}
    </tr>
  ))
}

function MobileRow<T>({ row, columns }: { row: T; columns: readonly DataTableColumn<T>[] }) {
  const visibleColumns = columns.filter(column => column.mobileVisible !== false && !column.hideOnMobile)
  const [primary, ...rest] = visibleColumns

  return (
    <article className="ui-data-table__mobile-card">
      {primary && <div className="ui-data-table__mobile-title">{renderColumn(row, primary)}</div>}
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rest.map(column => (
          <div key={columnId(column)} className="ui-data-table__mobile-field">
            <dt className="ui-data-table__mobile-label">{column.header}</dt>
            <dd className="ui-data-table__mobile-value">{renderColumn(row, column)}</dd>
          </div>
        ))}
      </dl>
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
  searchableText,
  filters = [],
  initialSort,
  searchable = true,
  search,
  onSearchChange,
  className = '',
}: DataTableProps<T>) {
  const [internalQuery, setInternalQuery] = useState('')
  const query = search ?? internalQuery
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ columnId: string; direction: SortDirection } | null>(
    initialSort ? { columnId: initialSort.columnId, direction: initialSort.direction ?? 'asc' } : null,
  )
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const filteredRows = useMemo(() => {
    const searchFields = columns.filter(column => column.searchable !== false)
    const normalizedQuery = normalize(query)

    return rows.filter(row => {
      const searchText = searchableText
        ? searchableText(row)
        : searchFields.map(column => String(columnValue(row, column) ?? '')).join(' ')

      const matchesQuery = !normalizedQuery || normalize(searchText).includes(normalizedQuery)
      const matchesFilters = filters.every(filter => {
        const selected = filterValues[filter.id]
        return !selected || filter.getValue(row) === selected
      })
      return matchesQuery && matchesFilters
    })
  }, [columns, filterValues, filters, query, rows, searchableText])

  const sortedRows = useMemo(() => {
    if (!sort) return [...filteredRows]
    const column = columns.find(item => columnId(item) === sort.columnId)
    if (!column) return [...filteredRows]

    return [...filteredRows].sort((a, b) => {
      const result = compareValues(columnValue(a, column), columnValue(b, column))
      return sort.direction === 'asc' ? result : -result
    })
  }, [columns, filteredRows, sort])

  const effectivePageSize = Math.max(1, pageSize)
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / effectivePageSize))
  const safePage = Math.min(page, pageCount)
  const visibleRows = sortedRows.slice((safePage - 1) * effectivePageSize, safePage * effectivePageSize)

  function changeSort(column: DataTableColumn<T>) {
    if (column.sortable === false) return
    if (!column.sortValue && !column.accessor && !(column.id ?? column.key)) return
    const id = columnId(column)
    setSort(current => {
      if (!current || current.columnId !== id) return { columnId: id, direction: 'asc' }
      return { columnId: id, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    })
    setPage(1)
  }

  return (
    <section className={`ui-data-table flex flex-col overflow-hidden ${className}`.trim()}>
      <div className="ui-data-table__toolbar flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="ui-data-table__search-wrap relative min-w-0 flex-1 sm:min-w-[240px]">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <span className="sr-only">البحث</span>
          <input
            disabled={!searchable}
            value={query}
            onChange={event => {
              onSearchChange?.(event.target.value)
              if (search === undefined) setInternalQuery(event.target.value)
              setPage(1)
            }}
            placeholder={searchPlaceholder}
            inputMode="search"
            className="ui-data-table__search w-full"
          />
        </label>

        {filters.map(filter => (
          <label key={filter.id} className="ui-data-table__filter-wrap flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[170px] sm:flex-none">
            <span className="ui-data-table__filter-label">{filter.label}</span>
            <select
              value={filterValues[filter.id] ?? ''}
              onChange={event => {
                const value = event.target.value
                setFilterValues(current => ({ ...current, [filter.id]: value }))
                setPage(1)
              }}
              className="ui-data-table__filter"
            >
              <option value="">الكل</option>
              {filter.options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}

        <span className="ui-data-table__count text-sm font-semibold">{filteredRows.length} سجل</span>
      </div>

      {visibleRows.length ? (
        <>
          <div className="ui-data-table__desktop hidden overflow-x-auto md:block">
            <table className="ui-data-table__table w-full text-right">
              <thead className="ui-data-table__thead">
                <tr className="divide-x divide-x-reverse divide-gray-100">
                  {columns.map(column => {
                    const id = columnId(column)
                    const active = sort?.columnId === id
                    const canSort = column.sortable !== false && (Boolean(column.sortValue) || Boolean(column.accessor) || Boolean(column.id ?? column.key))
                    return (
                      <th key={id} scope="col" className={`px-6 py-4 text-sm font-semibold text-slate-700 ${column.className ?? ''}`}>
                        <button
                          type="button"
                          disabled={!canSort}
                          onClick={() => changeSort(column)}
                          className={`inline-flex items-center gap-1.5 text-right ${canSort ? 'cursor-pointer hover:text-primary-700' : 'cursor-default'}`}
                        >
                          <span>{column.header}</span>
                          {canSort && active && (sort?.direction === 'asc' ? <ChevronUp size={15} /> : <ChevronDown size={15} />)}
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="ui-data-table__tbody">
                {visibleRows.map(row => (
                  <tr key={rowKey(row)} className="ui-data-table__row transition-colors">
                    {columns.map(column => <td key={columnId(column)} className={`ui-data-table__td align-middle ${column.className ?? ''}`}>{renderColumn(row, column)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ui-data-table__mobile grid gap-3 md:hidden">
            {visibleRows.map(row => <MobileRow key={rowKey(row)} row={row} columns={columns} />)}
          </div>
        </>
      ) : (
        emptyState ?? <div className="ui-data-table__empty">لا توجد سجلات مطابقة.</div>
      )}

      {sortedRows.length > effectivePageSize && (
        <footer className="ui-data-table__footer flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>صفحة {safePage} من {pageCount}</span>
          <div className="ui-data-table__footer-actions flex gap-2">
            <button type="button" className="ui-data-table__footer-button" disabled={safePage <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>السابق</button>
            <button type="button" className="ui-data-table__footer-button" disabled={safePage >= pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))}>التالي</button>
          </div>
        </footer>
      )}
    </section>
  )
}
