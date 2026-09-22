import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type CurrencyCode = 'EGP' | 'SAR' | 'AED' | 'USD' | 'EUR' | 'KWD' | 'QAR'

export const CURRENCY_OPTIONS: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'EGP', label: 'الجنيه المصري (ج.م)' },
  { code: 'SAR', label: 'الريال السعودي (ر.س)' },
  { code: 'AED', label: 'الدرهم الإماراتي (د.إ)' },
  { code: 'USD', label: 'الدولار الأمريكي ($)' },
  { code: 'EUR', label: 'اليورو (€)' },
  { code: 'KWD', label: 'الدينار الكويتي (د.ك)' },
  { code: 'QAR', label: 'الريال القطري (ر.ق)' },
]

interface CurrencyContextValue {
  currencyCode: CurrencyCode
  currencyLabel: string
  formatMoney: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string
  formatNumber: (value: number | null | undefined, maximumFractionDigits?: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

/** Provides one currency policy to the whole application. The code is sourced from organization settings. */
export function CurrencyProvider({ currencyCode, children }: { currencyCode?: string; children: ReactNode }) {
  const normalized = normalizeCurrencyCode(currencyCode)
  const [code, setCode] = useState<CurrencyCode>(normalized)

  useEffect(() => setCode(normalized), [normalized])

  const value = useMemo<CurrencyContextValue>(() => {
    const option = CURRENCY_OPTIONS.find(item => item.code === code)
    return {
      currencyCode: code,
      currencyLabel: option?.label ?? code,
      formatMoney: (amount, options) => {
        if (amount == null || !Number.isFinite(Number(amount))) return '—'
        return new Intl.NumberFormat('ar-EG', {
          style: 'currency',
          currency: code,
          currencyDisplay: 'symbol',
          maximumFractionDigits: 2,
          ...options,
        }).format(Number(amount))
      },
      formatNumber: (amount, maximumFractionDigits = 2) => new Intl.NumberFormat('ar-EG', {
        maximumFractionDigits,
      }).format(Number(amount ?? 0) || 0),
    }
  }, [code])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyContextValue {
  const value = useContext(CurrencyContext)
  if (!value) throw new Error('useCurrency يجب استخدامه داخل CurrencyProvider.')
  return value
}

export function normalizeCurrencyCode(value?: string): CurrencyCode {
  const candidate = String(value ?? '').trim().toUpperCase()
  return CURRENCY_OPTIONS.some(item => item.code === candidate) ? candidate as CurrencyCode : 'EGP'
}
