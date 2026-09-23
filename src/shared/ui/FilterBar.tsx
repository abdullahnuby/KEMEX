import type { ReactNode } from 'react'
import { Search } from 'lucide-react'

export interface FilterOption { label: string; value: string }
export interface FilterBarFilter { id: string; label: string; options: FilterOption[]; value: string; onChange: (value: string) => void }

export interface FilterBarProps {
  search?: string
  onSearch?: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterBarFilter[]
  actions?: ReactNode
  className?: string
}

export function FilterBar({ search, onSearch, searchPlaceholder = 'بحث…', filters = [], actions, className = '' }: FilterBarProps) {
  return (
    <div className={`ui-filter-bar ${className}`.trim()}>
      {onSearch && (
        <label className="min-w-0 flex-1 sm:min-w-[240px]">
          <span className="sr-only">البحث</span>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search ?? ''} onChange={e => onSearch(e.target.value)} placeholder={searchPlaceholder} className="ui-filter-bar__control" />
          </div>
        </label>
      )}
      {filters.map(filter => (
        <label key={filter.id} className="min-w-0 sm:min-w-[170px]">
          <span className="mb-1 block text-sm font-medium text-gray-500">{filter.label}</span>
          <select value={filter.value} onChange={e => filter.onChange(e.target.value)} className="ui-filter-bar__control">
            <option value="">الكل</option>
            {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ))}
      {actions && <div className="flex items-center gap-2 sm:ms-auto">{actions}</div>}
    </div>
  )
}
