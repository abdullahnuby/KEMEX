import { ArrowUpLeft, Construction } from 'lucide-react'
import { PageHeader, Card } from '../shared/ui'

export function ModulePlaceholderPage({title, description, onRoute}:{title:string;description:string;onRoute:(r:string)=>void}) {
  return <div>
    <PageHeader title={title} description={description} />
    <Card className="placeholder-panel">
      <div className="placeholder-icon"><Construction size={32}/></div>
      <h2>الوحدة موجودة ضمن هيكل KEMEX</h2>
      <p>هذه الشاشة محفوظة كبوابة للموديول ضمن منصة KEMEX. سيتم ربطها بالـ PostgreSQL والـ workflows دون تغيير تعريفات البيانات الحالية.</p>
      <button className="secondary-button" onClick={()=>onRoute('dashboard')}>العودة للوحة المعلومات <ArrowUpLeft size={16}/></button>
    </Card>
  </div>
}
