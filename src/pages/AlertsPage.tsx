import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, FileWarning, Fuel, ShieldAlert, Wrench } from 'lucide-react'
import type { Asset, Contract, Driver, FuelOperation, WorkOrder } from '../types/tfms'
import { PageHeader, StatusBadge } from '../components/ui'

import { APP_LOCALE } from '../shared/formatters/locale'
type Alert = { id:string; title:string; entity:string; detail:string; severity:'عالي'|'متوسط'|'منخفض'; route:string; icon:'license'|'maintenance'|'contract'|'fuel'|'general' }

export function AlertsPage({assets,workOrders,fuelOps,drivers,contracts,onRoute,alertDays=30,alertKm=1500,alertHours=80,plans=[],oils=[]}:{assets:Asset[];workOrders:WorkOrder[];fuelOps:FuelOperation[];drivers:Driver[];contracts:Contract[];onRoute:(route:string)=>void;alertDays?:number;alertKm?:number;alertHours?:number;plans?:Record<string,unknown>[];oils?:Record<string,unknown>[]}) {
  const alerts=useMemo(()=>buildAlerts(assets,workOrders,fuelOps,drivers,contracts,alertDays,alertKm,alertHours,plans,oils),[assets,workOrders,fuelOps,drivers,contracts,alertDays,alertKm,alertHours,plans,oils])
  const high=alerts.filter(x=>x.severity==='عالي').length
  const medium=alerts.filter(x=>x.severity==='متوسط').length
  return <div className="space-y-6">
    <PageHeader title="التنبيهات والاستحقاقات" description="متابعة الاستحقاقات التشغيلية والصيانة والتعاقدات من شاشة واحدة." />
    <div className="metric-grid compact">
      <Metric icon={ShieldAlert} label="عالية" value={high}/>
      <Metric icon={Clock3} label="متوسطة" value={medium}/>
      <Metric icon={AlertTriangle} label="الإجمالي" value={alerts.length}/>
      <Metric icon={CheckCircle2} label="لا توجد أخطاء نظام" value="جاهز"/>
    </div>
    <section className="panel">
      {!alerts.length ? <div className="empty"><CheckCircle2 size={26}/><strong>لا توجد تنبيهات نشطة</strong><span>كل الاستحقاقات الحالية داخل الحدود المسموح بها.</span></div> :
      <div className="alert-list">{alerts.map(a=><button className="alert-row" key={a.id} onClick={()=>onRoute(a.route)}>
        <span className={`alert-dot ${a.severity==='عالي'?'red':a.severity==='متوسط'?'amber':'gray'}`}/>
        <span className="alert-icon">{a.icon==='maintenance'?<Wrench size={16}/>:a.icon==='license'?<FileWarning size={16}/>:a.icon==='fuel'?<Fuel size={16}/>:<AlertTriangle size={16}/>}</span>
        <span className="alert-copy"><strong>{a.title}</strong><span>{a.entity}</span><small>{a.detail}</small></span>
        <StatusBadge tone={a.severity==='عالي'?'red':a.severity==='متوسط'?'amber':'gray'}>{a.severity}</StatusBadge>
      </button>)}</div>}
    </section>
  </div>
}

function buildAlerts(assets:Asset[],workOrders:WorkOrder[],fuelOps:FuelOperation[],drivers:Driver[],contracts:Contract[],alertDays:number,alertKm:number,alertHours:number,plans:Record<string,unknown>[],oils:Record<string,unknown>[]):Alert[] {
  const out:Alert[]=[]
  for(const a of assets){
    const lic=daysTo(a.lic); const ins=daysTo(a.ins)
    if(lic!==null && lic<=alertDays) out.push({id:`lic-${a.id}`,title:lic<=0?'رخصة منتهية':'الرخصة ستنتهي قريبًا',entity:a.name || a.code,detail:lic<=0?'يجب إيقاف المعاملة الإدارية حتى التجديد.':`متبقٍ ${Math.max(0,lic)} يوم`,severity:lic<=0?'عالي':'متوسط',route:'assets',icon:'license'})
    if(ins!==null && ins<=alertDays) out.push({id:`ins-${a.id}`,title:ins<=0?'التأمين منتهي':'التأمين يقترب من الانتهاء',entity:a.name || a.code,detail:ins<=0?'يلزم تحديث وثيقة التأمين.':`متبقٍ ${Math.max(0,ins)} يوم`,severity:ins<=0?'عالي':'متوسط',route:'assets',icon:'license'})
    if(['تحت الصيانة','بانتظار الإصلاح','بانتظار الفحص'].includes(a.status)) out.push({id:`maint-${a.id}`,title:'الأصل خارج الجاهزية التشغيلية',entity:a.name || a.code,detail:a.status,severity:'متوسط',route:'maintenance',icon:'maintenance'})
  }
  // Proactive abnormal-fuel detection: reuse the report's consumption logic
  // as a push alert. Require at least two valid meter readings to avoid false
  // positives from a single fueling transaction. Threshold is intentionally
  // configurable here as a conservative 20% over standard consumption.
  for(const a of assets){
    if(!a.std || Number(a.std) <= 0) continue
    const recent = fuelOps
      .filter(f => (f.assetId === a.id || f.assetId === a.code) && f.type !== 'استلام' && f.status === 'معتمد')
      .filter(f => daysTo(f.date) !== null && Number(daysTo(f.date)) >= -30)
      .filter(f => Number(f.qty) > 0 && Number.isFinite(Number(f.meter)))
      .sort((x,y) => Number(x.meter) - Number(y.meter))
    if(recent.length < 2) continue
    const first = recent[0]
    const last = recent[recent.length - 1]
    const delta = Number(last.meter) - Number(first.meter)
    const liters = recent.reduce((sum,f)=>sum+Number(f.qty||0),0)
    if(delta <= 0 || liters <= 0) continue
    const actual = a.mt === 'كم' ? liters / delta * 100 : null
    if(actual === null) continue
    const variance = (actual - Number(a.std)) / Number(a.std) * 100
    if(variance >= 20){
      out.push({id:`fuel-${a.id}`,title:'استهلاك وقود غير طبيعي',entity:a.name || a.code,detail:`استهلاك فعلي ${actual.toLocaleString(APP_LOCALE,{maximumFractionDigits:1})} ل/100كم مقابل معيار ${Number(a.std).toLocaleString(APP_LOCALE,{maximumFractionDigits:1})} — انحراف ${variance.toLocaleString(APP_LOCALE,{maximumFractionDigits:0})}%`,severity:variance>=35?'عالي':'متوسط',route:'fuel',icon:'fuel'})
    }
  }

  for(const w of workOrders.filter(x=>!['مكتمل','ملغى'].includes(x.status))){
    if(w.prio==='عالية'||w.prio==='عاجلة') out.push({id:`wo-${w.id}`,title:'أمر صيانة ذو أولوية',entity:w.desc||w.id,detail:`${w.type}${w.id ? ` · ${w.id}` : ''}`,severity:w.prio==='عاجلة'?'عالي':'متوسط',route:'maintenance',icon:'maintenance'})
  }
  for(const d of drivers){const left=daysTo(d.licExp);if(left!==null&&left<=alertDays)out.push({id:`drv-${d.id}`,title:left<=0?'رخصة السائق منتهية':'رخصة السائق ستنتهي قريبًا',entity:d.name,detail:left<=0?'تحتاج إلى التجديد.':`متبقٍ ${left} يوم`,severity:left<=0?'عالي':'متوسط',route:'drivers',icon:'license'})}
  for(const c of contracts){const left=daysTo(c.end);if(left!==null&&left<=45)out.push({id:`con-${c.id}`,title:left<=0?'عقد منتهي':'عقد يقترب من الانتهاء',entity:`${c.number} — ${c.lessor}`,detail:left<=0?'يجب مراجعة حالة العقد.':`متبقٍ ${left} يوم`,severity:left<=0?'عالي':'متوسط',route:'contracts',icon:'contract'})}
  for(const p of [...plans,...oils]){
    const a=assets.find(x=>x.id===String(p.asset??'')); if(!a) continue
    const everyKm=Number(p.everyKm||0), everyHours=Number(p.everyHours||0), lastMeter=Number(p.lastMeter||0), everyDays=Number(p.everyDays||0)
    if(everyDays>0){
      const lastDate=String(p.lastDate??'')
      const dueAt=lastDate?new Date(lastDate).getTime()+everyDays*86400000:null
      if(dueAt!==null&&!Number.isNaN(dueAt)){
        const left=Math.ceil((dueAt-Date.now())/86400000)
        if(left<=alertDays) out.push({id:`datedue-${String(p.id)}`,title:left<=0?'استحقاق زمني متجاوز':'استحقاق زمني قريب',entity:a.name || a.code,detail:left<=0?'يجب إنشاء/تنفيذ الإجراء المستحق.':`متبقٍ ${left} يوم`,severity:left<=0?'عالي':'متوسط',route:'oils',icon:'maintenance'})
      }
    }
    const cadence=a.mt==='كم'?everyKm:everyHours
    const threshold=a.mt==='كم'?alertKm:alertHours
    if(cadence>0){
      const remaining=lastMeter+cadence-Number(a.meter||0)
      if(remaining<=threshold) out.push({id:`meterdue-${String(p.id)}`,title:remaining<=0?'استحقاق عداد متجاوز':'استحقاق عداد قريب',entity:a.name || a.code,detail:remaining<=0?'يجب إنشاء/تنفيذ الإجراء المستحق.':`متبقٍ ${remaining.toLocaleString(APP_LOCALE)} ${a.mt==='كم'?'كم':'ساعة'}`,severity:remaining<=0?'عالي':'متوسط',route:'oils',icon:'maintenance'})
    }
  }
  return out.sort((a,b)=>priority(b.severity)-priority(a.severity))
}

function priority(x:Alert['severity']){return x==='عالي'?3:x==='متوسط'?2:1}
function daysTo(v?:string){if(!v)return null;const t=new Date(v).getTime();if(Number.isNaN(t))return null;return Math.ceil((t-Date.now())/86400000)}
function Metric({icon:Icon,label,value}:{icon:typeof ShieldAlert;label:string;value:string|number}){return <div className="metric-card"><div className="metric-icon"><Icon size={18}/></div><div className="metric-body"><span>{label}</span><strong>{value}</strong></div></div>}
