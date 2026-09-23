import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../../types/tfms'
import { repository } from '../../services/repositoryFactory'

interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (newPassword: string) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const SESSION_KEY = 'tfms-web-user'

function readSession(): User | null {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) as User : null } catch { return null }
}

/** Central auth boundary. Session state is isolated from feature/page components. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readSession())
  const [loading, setLoading] = useState(repository.isRemote())
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!repository.isRemote()) { setLoading(false); return }
    repository.getCurrentUser().then(current => {
      if (!active) return
      setUser(current)
      if (current) {
        repository.setAuditActor(current)
        localStorage.setItem(SESSION_KEY, JSON.stringify(current))
      } else {
        repository.clearAuditActor()
        localStorage.removeItem(SESSION_KEY)
      }
      setLoading(false)
    }).catch(reason => {
      if (!active) return
      setUser(null)
      setLoading(false)
      setError(reason instanceof Error ? `تعذر التحقق من جلسة المستخدم: ${reason.message}` : 'تعذر التحقق من جلسة المستخدم.')
    })
    return () => { active = false }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setError('')
    const next = await repository.signIn(username.trim(), password)
    repository.setAuditActor(next)
    setUser(next)
    localStorage.setItem(SESSION_KEY, JSON.stringify(next))
  }, [])

  const logout = useCallback(async () => {
    setError('')
    repository.clearAuditActor()
    await repository.signOut()
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const changePassword = useCallback(async (newPassword: string) => {
    setError('')
    await repository.changePassword(newPassword)
    setUser(current => {
      if (!current) return current
      const updated = { ...current, mustChangePassword: false }
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const value = useMemo(() => ({ user, loading, error, login, logout, changePassword, clearError: () => setError('') }), [user, loading, error, login, logout, changePassword])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth يجب استخدامه داخل AuthProvider.')
  return value
}
