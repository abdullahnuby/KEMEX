import { useState, useEffect } from 'react'

export const MOBILE_BREAKPOINT = 760
export const TABLET_BREAKPOINT = 1080

/**
 * Generic media-query hook.
 *
 * Returns `false` during SSR (no `window`), then mirrors `matchMedia(query)`
 * and re-renders on `change` events. The listener is cleaned up on unmount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)

    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

/**
 * Mobile-breakpoint hook.
 *
 * Defaults to `MOBILE_BREAKPOINT` (760px). Pass a different value (e.g.
 * `TABLET_BREAKPOINT`) to test tablet-sized viewports.
 */
export function useMobileBreakpoint(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  return useMediaQuery(`(max-width: ${breakpoint}px)`)
}
