import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { useSettingsStore } from '../store/settingsStore'

const TOAST_STYLES = {
  dark: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#e2e8f0'
  },
  light: {
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    color: '#1e293b'
  }
} as const

function useResolvedTheme(): 'dark' | 'light' {
  const themeMode = useSettingsStore((s) => s.theme)
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  )

  useEffect(() => {
    if (themeMode !== 'system') return
    const q = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    q.addEventListener('change', handler)
    return () => q.removeEventListener('change', handler)
  }, [themeMode])

  return themeMode === 'system' ? (systemDark ? 'dark' : 'light') : themeMode
}

export function ThemeToaster(): React.JSX.Element {
  const resolved = useResolvedTheme()
  return (
    <Toaster
      position="bottom-right"
      theme={resolved}
      toastOptions={{
        style: TOAST_STYLES[resolved]
      }}
    />
  )
}
