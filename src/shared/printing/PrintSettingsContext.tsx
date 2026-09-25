import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type PrintOrientation = 'auto' | 'portrait' | 'landscape'
export type PrintSignatureMode = 'every-page' | 'last-page' | 'none'
export type PrintTableDensity = 'compact' | 'standard' | 'comfortable'
export type PrintLayoutStyle = 'corporate' | 'minimal' | 'clean'
export type PrintFontFamily = 'alexandria' | 'tajawal' | 'system'

export type PrintSettings = {
  /** Master switch: when false, pages may keep their own print presentation instead of the corporate template. */
  applyGlobalTemplate: boolean
  companyName?: string
  groupName?: string
  companyAddress: string
  companyContact: string
  showLogo: boolean
  logoSrc: string
  logoWidthMm: number
  showCompanyName: boolean
  showGroupName: boolean
  showCompanyDetails: boolean
  showDocumentLabel: boolean
  showDocumentMeta: boolean
  showHeaderRule: boolean
  showFooter: boolean
  showPageNumbers: boolean
  showAppName: boolean
  appName: string
  footerText: string
  primaryColor: string
  layoutStyle: PrintLayoutStyle
  fontFamily: PrintFontFamily
  paperSize: 'A4' | 'Letter'
  orientation: PrintOrientation
  marginTopMm: number
  marginRightMm: number
  marginBottomMm: number
  marginLeftMm: number
  tableDensity: PrintTableDensity
  signatureMode: PrintSignatureMode
  signatureHeightMm: number
  signatureLabels: string[]
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  applyGlobalTemplate: true,
  companyName: '',
  groupName: '',
  companyAddress: '',
  companyContact: '',
  showLogo: true,
  logoSrc: '',
  logoWidthMm: 32,
  showCompanyName: true,
  showGroupName: false,
  showCompanyDetails: false,
  showDocumentLabel: false,
  showDocumentMeta: true,
  showHeaderRule: true,
  showFooter: true,
  showPageNumbers: true,
  showAppName: false,
  appName: 'KEMEX',
  footerText: '',
  primaryColor: '#0b7285',
  layoutStyle: 'corporate',
  fontFamily: 'alexandria',
  paperSize: 'A4',
  orientation: 'auto',
  marginTopMm: 10,
  marginRightMm: 12,
  marginBottomMm: 44,
  marginLeftMm: 12,
  tableDensity: 'standard',
  signatureMode: 'every-page',
  signatureHeightMm: 19,
  signatureLabels: ['إعداد', 'مراجعة', 'اعتماد'],
}

export function normalizePrintSettings(value: unknown): PrintSettings {
  if (!value || typeof value !== 'object') return DEFAULT_PRINT_SETTINGS
  const raw = value as Partial<PrintSettings>
  const signatureLabels = Array.isArray(raw.signatureLabels)
    ? raw.signatureLabels.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 4)
    : DEFAULT_PRINT_SETTINGS.signatureLabels

  return {
    ...DEFAULT_PRINT_SETTINGS,
    ...raw,
    applyGlobalTemplate: raw.applyGlobalTemplate !== false,
    companyName: String(raw.companyName ?? '').trim(),
    groupName: String(raw.groupName ?? '').trim(),
    companyAddress: String(raw.companyAddress ?? '').trim(),
    companyContact: String(raw.companyContact ?? '').trim(),
    showLogo: raw.showLogo !== false,
    logoSrc: String(raw.logoSrc ?? '').trim(),
    logoWidthMm: clampMm(raw.logoWidthMm, DEFAULT_PRINT_SETTINGS.logoWidthMm, 18, 70),
    showCompanyName: raw.showCompanyName !== false,
    showGroupName: raw.showGroupName === true,
    showCompanyDetails: raw.showCompanyDetails === true,
    showDocumentLabel: raw.showDocumentLabel === true,
    showDocumentMeta: raw.showDocumentMeta !== false,
    showHeaderRule: raw.showHeaderRule !== false,
    showFooter: raw.showFooter !== false,
    showPageNumbers: raw.showPageNumbers !== false,
    showAppName: raw.showAppName !== false,
    appName: String(raw.appName ?? DEFAULT_PRINT_SETTINGS.appName).trim() || DEFAULT_PRINT_SETTINGS.appName,
    footerText: String(raw.footerText ?? '').trim(),
    primaryColor: /^#[0-9a-f]{6}$/i.test(String(raw.primaryColor ?? '')) ? String(raw.primaryColor) : DEFAULT_PRINT_SETTINGS.primaryColor,
    layoutStyle: raw.layoutStyle === 'minimal' || raw.layoutStyle === 'clean' ? raw.layoutStyle : 'corporate',
    fontFamily: raw.fontFamily === 'tajawal' || raw.fontFamily === 'system' ? raw.fontFamily : 'alexandria',
    paperSize: raw.paperSize === 'Letter' ? 'Letter' : 'A4',
    orientation: raw.orientation === 'portrait' || raw.orientation === 'landscape' ? raw.orientation : 'auto',
    marginTopMm: clampMm(raw.marginTopMm, 10),
    marginRightMm: clampMm(raw.marginRightMm, 12),
    marginBottomMm: clampMm(raw.marginBottomMm, 42, 30, 60),
    marginLeftMm: clampMm(raw.marginLeftMm, 12),
    tableDensity: raw.tableDensity === 'compact' || raw.tableDensity === 'comfortable' ? raw.tableDensity : 'standard',
    signatureMode: raw.signatureMode === 'last-page' || raw.signatureMode === 'none' ? raw.signatureMode : 'every-page',
    signatureHeightMm: clampMm(raw.signatureHeightMm, DEFAULT_PRINT_SETTINGS.signatureHeightMm, 12, 35),
    signatureLabels: signatureLabels.length ? signatureLabels : DEFAULT_PRINT_SETTINGS.signatureLabels,
  }
}

function clampMm(value: unknown, fallback: number, min = 5, max = 60): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

const PrintSettingsContext = createContext<PrintSettings>(DEFAULT_PRINT_SETTINGS)

export function PrintSettingsProvider({ settings, children }: { settings?: unknown; children: ReactNode }) {
  const normalized = useMemo(() => normalizePrintSettings(settings), [settings])
  return <PrintSettingsContext.Provider value={normalized}>{children}</PrintSettingsContext.Provider>
}

export function usePrintSettings(): PrintSettings {
  return useContext(PrintSettingsContext)
}
