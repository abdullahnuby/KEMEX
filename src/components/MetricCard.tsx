import type { LucideIcon } from 'lucide-react'
export function MetricCard({ label, value, meta, icon: Icon, tone = 'teal' }: {label:string; value:string|number; meta?:string; icon:LucideIcon; tone?:string}) {
  return <div className={`metric-card ${tone}`}><div className="metric-icon"><Icon size={19}/></div><div className="metric-body"><span>{label}</span><strong>{value}</strong>{meta && <small>{meta}</small>}</div></div>
}
