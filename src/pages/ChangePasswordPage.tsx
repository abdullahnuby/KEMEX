import { FormEvent, useMemo, useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { APP } from '../config/app'
import type { User } from '../types/tfms'

export function ChangePasswordPage({ user, onChangePassword, onLogout }: { user: User; onChangePassword: (password: string) => Promise<void>; onLogout: () => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const strength = useMemo(() => {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }, [password])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.')
    if (password !== confirm) return setError('تأكيد كلمة المرور غير مطابق.')
    if (password === '12345678' || password === 'password') return setError('اختر كلمة مرور مختلفة وأكثر أمانًا.')
    setBusy(true)
    try {
      await onChangePassword(password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تغيير كلمة المرور.')
    } finally { setBusy(false) }
  }

  return <div className="login-page" dir="rtl">
    <div className="login-orbit orbit-a"/><div className="login-orbit orbit-b"/>
    <section className="login-card" style={{ maxWidth: 540 }}>
      <div className="login-brand"><img className="login-brand-logo" src="/kemex-logo.png" alt={APP.name} /><div className="brand-sub">{APP.arabicName}</div></div>
      {!done ? <>
        <div className="login-heading"><h1>تغيير كلمة المرور</h1><p>مرحبًا {user.name || user.username}. هذه أول مرة تدخل فيها بهذا الحساب، ويجب تغيير كلمة المرور المؤقتة قبل استخدام النظام.</p></div>
        <form onSubmit={submit} className="login-form">
          <label><span>كلمة المرور الجديدة</span><div className="input-wrap"><KeyRound size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={8}/></div></label>
          <div className="password-meter" aria-label="قوة كلمة المرور"><div className={`password-meter-bar score-${strength}`} style={{ width:`${Math.max(8,strength/5*100)}%` }}/><small>{strength < 3 ? 'ضعيفة' : strength < 5 ? 'جيدة' : 'قوية'}</small></div>
          <label><span>تأكيد كلمة المرور</span><div className="input-wrap"><ShieldCheck size={17}/><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" minLength={8}/></div></label>
          <div className="form-hint">استخدم 8 أحرف على الأقل، ويفضل الجمع بين الحروف والأرقام والرموز.</div>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button wide" disabled={busy}>{busy ? 'جارٍ حفظ كلمة المرور...' : 'حفظ والدخول إلى النظام'}</button>
          <button type="button" className="secondary-button wide" disabled={busy} onClick={()=>void onLogout()}>تسجيل الخروج</button>
        </form>
      </> : <div className="form-success" style={{ marginTop: 24 }}><strong>تم تغيير كلمة المرور بنجاح.</strong><p>أصبح الحساب جاهزًا للاستخدام.</p></div>}
    </section>
  </div>
}
