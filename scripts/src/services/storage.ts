const KEY = 'tfms-web-demo-v1'

export function loadLocal<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveLocal<T>(value: T) {
  localStorage.setItem(KEY, JSON.stringify(value))
}

export function clearLocal() {
  localStorage.removeItem(KEY)
}
