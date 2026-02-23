import type { ThemeMode } from '../store/settingsStore'
import { useSettingsStore } from '../store/settingsStore'

export type ResolvedTheme = 'dark' | 'light'

function getSystemDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light') return 'light'
  if (mode === 'dark') return 'dark'
  return getSystemDark() ? 'dark' : 'light'
}

export function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved
}

function runSync(): void {
  const mode = useSettingsStore.getState().theme
  const resolved = resolveTheme(mode)
  applyTheme(resolved)
}

let systemQuery: MediaQueryList | null = null

function subscribeSystem(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  systemQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => callback()
  systemQuery.addEventListener('change', listener)
  return () => {
    systemQuery?.removeEventListener('change', listener)
    systemQuery = null
  }
}

/**
 * Initialize theme from store, apply to document, and keep in sync with
 * store changes and (when theme is "system") OS preference.
 */
export function initTheme(): () => void {
  runSync()

  const unsubStore = useSettingsStore.subscribe(() => {
    const mode = useSettingsStore.getState().theme
    runSync()
    if (mode === 'system') {
      // Ensure we're listening to system; subscribeSystem is idempotent per call
      teardownSystem?.()
      teardownSystem = subscribeSystem(runSync)
    } else {
      teardownSystem?.()
      teardownSystem = null
    }
  })

  let teardownSystem: (() => void) | null = null
  if (useSettingsStore.getState().theme === 'system') {
    teardownSystem = subscribeSystem(runSync)
  }

  return () => {
    unsubStore()
    teardownSystem?.()
  }
}

/**
 * Get the current resolved theme (for React components, e.g. Toaster).
 */
export function getEffectiveTheme(): ResolvedTheme {
  const mode = useSettingsStore.getState().theme
  return resolveTheme(mode)
}
