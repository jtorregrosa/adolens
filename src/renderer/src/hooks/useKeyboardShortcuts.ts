import { useEffect } from 'react'

interface Shortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  handler: () => void
}

/**
 * Register multiple keyboard shortcuts. Each shortcut fires when the specified
 * modifier (ctrl or meta/cmd) + key combination is pressed.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    const handle = (e: KeyboardEvent): void => {
      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? e.ctrlKey || e.metaKey : true
        const metaMatch = s.meta ? e.metaKey : true
        const shiftMatch = s.shift ? e.shiftKey : true
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase()
        const exactCtrl = s.ctrl !== undefined ? s.ctrl === (e.ctrlKey || e.metaKey) : true
        const exactShift = s.shift !== undefined ? s.shift === e.shiftKey : true

        if (keyMatch && exactCtrl && metaMatch && ctrlMatch && shiftMatch && exactShift) {
          e.preventDefault()
          s.handler()
          return
        }
      }
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [shortcuts])
}
