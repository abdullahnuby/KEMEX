import { AlertTriangle, ArrowUpRight, Bell, Check, LogOut, Search, UserRound, X, type LucideIcon } from 'lucide-react'
import type { User } from '../../types/tfms'
import type { AppNotification } from '../../features/notifications/types'
import { ROLE_LABELS } from '../../config/app'

export function NotificationPopover({
  notifications,
  unreadCount,
  loading,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
  onOpenAlerts,
}: {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  onRefresh: () => Promise<void>
  onMarkRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
  onOpenAlerts: () => void
}) {
  return (
    <section className="shell-popover shell-notification-popover" role="dialog" aria-label="التنبيهات">
      <div className="shell-popover-head">
        <div>
          <strong>التنبيهات</strong>
          <span>{unreadCount ? `${unreadCount} تنبيه غير مقروء` : 'لا توجد تنبيهات غير مقروءة'}</span>
        </div>
        <div className={`shell-popover-status ${unreadCount ? 'is-alert' : 'is-clear'}`} aria-hidden="true">
          {unreadCount ? <AlertTriangle size={16} /> : <Check size={16} />}
        </div>
      </div>
      <div className="shell-popover-body">
        {loading ? <div className="shell-empty-state"><span className="shell-empty-icon"><Bell size={17} /></span><div><strong>جارٍ التحديث</strong><small>جاري تحميل التنبيهات...</small></div></div> : notifications.length ? <div className="max-h-80 space-y-2 overflow-auto">
          {notifications.slice(0, 8).map(item => (
            <button key={item.id} type="button" className={`w-full rounded-xl border p-3 text-right ${item.read_at ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'}`} onClick={async () => { if (!item.read_at) await onMarkRead(item.id); if (item.link) onOpenAlerts() }}>
              <div className="flex items-start justify-between gap-2"><strong className="text-sm">{item.title}</strong>{!item.read_at && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">جديد</span>}</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{item.body}</p>
            </button>
          ))}
        </div> : <div className="shell-empty-state"><span className="shell-empty-icon"><Check size={17} /></span><div><strong>كل شيء هادئ</strong><small>لا توجد رسائل تشغيلية حديثة للحساب.</small></div></div>}
      </div>
      <div className="shell-popover-foot">
        <div className="flex items-center justify-between gap-2">
          <button className="shell-popover-link" type="button" onClick={onOpenAlerts}>فتح مركز التنبيهات <ArrowUpRight size={14} /></button>
          <div className="flex gap-1">
            <button type="button" className="shell-popover-link" onClick={() => void onRefresh()}>تحديث</button>
            <button type="button" className="shell-popover-link" onClick={() => void onMarkAllRead()} disabled={!unreadCount}>تعيين الكل كمقروء</button>
          </div>
        </div>
      </div>
    </section>
  )
}

export function UserMenu({ user, onChangePassword, onLogout }: { user: User; onChangePassword: () => void; onLogout: () => void }) {
  return (
    <section className="shell-popover shell-user-popover" role="dialog" aria-label="قائمة المستخدم">
      <div className="shell-user-hero">
        <div className="shell-user-avatar shell-user-avatar-lg">{user.name?.slice(0, 1) ?? 'م'}</div>
        <div className="shell-user-hero-copy">
          <strong>{user.name}</strong>
          <span>{ROLE_LABELS[user.role] ?? user.role}</span>
        </div>
      </div>
      <div className="shell-user-actions">
        <button className="shell-menu-action" onClick={onChangePassword}>
          <span className="shell-menu-action-icon"><UserRound size={16} /></span>
          <span><strong>تغيير كلمة المرور</strong><small>تحديث بيانات الدخول</small></span>
        </button>
        <button className="shell-menu-action is-danger" onClick={onLogout}>
          <span className="shell-menu-action-icon"><LogOut size={16} /></span>
          <span><strong>تسجيل الخروج</strong><small>إنهاء الجلسة الحالية</small></span>
        </button>
      </div>
    </section>
  )
}

export function GlobalSearchPanel({
  query,
  results,
  onQueryChange,
  onNavigate,
  onClose,
}: {
  query: string
  results: Array<{ key: string; label: string; hint: string; route: string; section: string; icon?: LucideIcon }>
  onQueryChange: (value: string) => void
  onNavigate: (route: string) => void
  onClose: () => void
}) {
  return (
    <section className="shell-search-popover" role="dialog" aria-label="البحث في النظام">
      <div className="shell-search-input-wrap">
        <Search size={17} aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Escape') onClose()
            if (event.key === 'Enter' && results[0]) onNavigate(results[0].route)
          }}
          placeholder="ابحث عن وحدة أو شاشة..."
          aria-label="البحث عن وحدة أو شاشة"
        />
        {query && <button className="shell-search-clear" onClick={() => onQueryChange('')} aria-label="مسح البحث"><X size={14} /></button>}
      </div>
      <div className="shell-search-meta">
        <span>{query.trim() ? `${results.length} نتيجة` : 'البحث في وحدات النظام'}</span>
        <kbd>Esc</kbd>
      </div>
      <div className="shell-search-results">
        {results.length ? results.map(result => {
          const Icon = result.icon ?? Search
          return (
            <button key={result.key} className="shell-search-result" onClick={() => onNavigate(result.route)}>
              <span className="shell-search-result-icon"><Icon size={16} /></span>
              <span className="shell-search-result-copy">
                <strong>{result.label}</strong>
                <small>{result.section} · {result.hint}</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
          )
        }) : (
          <div className="shell-search-empty">
            <Search size={19} />
            <strong>لا توجد نتائج</strong>
            <span>جرّب كلمة مختلفة مثل «الصيانة» أو «رحلات النقل».</span>
          </div>
        )}
      </div>
    </section>
  )
}
