import { useState, type FormEvent } from 'react'
import { LockKeyhole, Truck, UserRound } from 'lucide-react'
import { APP } from '../config/app'
import type { User } from '../types/tfms'

export function LoginPage({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { await onLogin(username.trim(), password) } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول') } finally { setBusy(false) }
  }

  return <div className="login-page">
    <div className="login-orbit orbit-a"/><div className="login-orbit orbit-b"/>
    <section className="login-card">
      <div className="login-brand"><div className="brand-mark large"><Truck size={30}/></div><div><div className="brand-name">{APP.name}</div><div className="brand-sub">{APP.arabicName}</div></div></div>
      <div className="login-heading"><h1>تسجيل الدخول</h1><p>{APP.subtitle}</p></div>
      <form onSubmit={submit} className="login-form">
        <label><span>اسم المستخدم أو البريد</span><div className="input-wrap"><UserRound size={17}/><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></div></label>
        <label><span>كلمة المرور</span><div className="input-wrap"><LockKeyhole size={17}/><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div></label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button wide" disabled={busy}>{busy ? 'جارٍ الدخول...' : 'دخول إلى النظام'}</button>
      </form>
      <div className="login-note">تسجيل الدخول يتم عبر Supabase Authentication. صلاحيات المستخدم يحددها ملفه في النظام.</div>
    </section>
  </div>
}
