import { useState, type ReactNode } from 'react'

export interface DetailTab {
  id: string
  label: string
  content: ReactNode
  disabled?: boolean
}

export interface DetailTabsProps {
  tabs: readonly DetailTab[]
  defaultTab?: string
  activeTab?: string
  onChange?: (tabId: string) => void
}

/** تبويبات موحدة لشاشات التفاصيل مع دعم لوحة المفاتيح وRTL. */
export function DetailTabs({ tabs, defaultTab, activeTab, onChange }: DetailTabsProps) {
  const firstEnabled = tabs.find(tab => !tab.disabled)?.id ?? ''
  const [internalTab, setInternalTab] = useState(defaultTab ?? firstEnabled)
  const selected = activeTab ?? internalTab
  const current = tabs.find(tab => tab.id === selected && !tab.disabled) ?? tabs.find(tab => !tab.disabled)

  function select(tabId: string) {
    setInternalTab(tabId)
    onChange?.(tabId)
  }

  return (
    <section className="ds-detail-tabs">
      <div className="ds-tabs-list" role="tablist" aria-label="أقسام التفاصيل">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected === tab.id}
            disabled={tab.disabled}
            className={selected === tab.id ? 'active' : ''}
            onClick={() => select(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="ds-tab-panel" role="tabpanel">
        {current?.content}
      </div>
    </section>
  )
}
