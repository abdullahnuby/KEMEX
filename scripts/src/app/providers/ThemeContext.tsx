import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
interface ThemeContextValue { theme: Theme; setTheme: (theme: Theme) => void; toggleTheme: () => void }
const ThemeContext = createContext<ThemeContextValue | null>(null)
const KEY = 'kemex-theme'

/** Theme boundary; direction and language remain fixed to the Arabic product contract. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light')
  useEffect(() => {
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])
  const value = useMemo(() => ({
    theme,
    setTheme: (next: Theme) => setThemeState(next),
    toggleTheme: () => setThemeState(current => current === 'light' ? 'dark' : 'light'),
  }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme يجب استخدامه داخل ThemeProvider.')
  return value
}
