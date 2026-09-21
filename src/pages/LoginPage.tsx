import { useState, type FormEvent } from 'react'
import { LockKeyhole, Truck, UserRound } from 'lucide-react'
import { APP, DEMO_PASSWORD, ROLE_LABELS } from '../config/app'
import { supabaseConfigured } from '../services/supabase'
import type { User } from '../types/tfms'

export function LoginPage({ users, onLogin }: { users: User[]; onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState(supabaseConfigured ? '' : 'admin')
  const [password, setPassword] = useState(supabaseConfigured ? '' : DEMO_PASSWORD)
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
      <div className="demo-login"><div className="demo-title">حسابات التجربة</div><div className="demo-grid">{users.slice(0,4).map((u) => <button key={u.username} onClick={() => {setUsername(u.username); setPassword(DEMO_PASSWORD)}}><strong>{u.username}</strong><span>{ROLE_LABELS[u.role]}</span></button>)}</div><small>كلمة المرور التجريبية: 1234</small></div>
      <div className="login-note">عند ربط Supabase ينتقل الدخول تلقائيًا إلى Authentication الحقيقي.</div>
    </section>
  </div>
}
