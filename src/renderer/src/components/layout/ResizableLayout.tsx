import { useEffect, useState } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Sidebar } from './Sidebar'
import { ComparisonArea } from '../diff/ComparisonArea'
import { useUIStore } from '../../store/uiStore'
import appIcon from '@resources/icon.png'

const appWindow = getCurrentWindow()

export function ResizableLayout(): React.JSX.Element {
  const { sidebarCollapsed } = useUIStore()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let unlisten: (() => void) | undefined

    appWindow.isMaximized().then(setIsMaximized)

    appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized())
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      unlisten?.()
    }
  }, [])

  return (
    <div className="flex h-full w-full flex-col bg-slate-950">
      {/* ── Custom title bar ─────────────────────────────────────────────── */}
      <div className="relative flex h-10 w-full shrink-0 items-center border-b border-slate-800 bg-slate-900">

        {/* Invisible full-width drag region sitting behind everything */}
        <div className="absolute inset-0" data-tauri-drag-region />

        {/* App icon + name — pointer-events-none so clicks fall to drag region */}
        <div className="relative flex select-none items-center gap-2 px-3 pointer-events-none">
          <img
            src={appIcon}
            alt="ADO Lens"
            className="h-4 w-4 shrink-0"
            draggable={false}
          />
          <span className="text-xs font-semibold tracking-wide text-slate-400">
            ADO Lens
          </span>
        </div>

        {/* Window control buttons — sit on top, always interactive */}
        <div className="relative ml-auto flex items-center">
          <button
            onClick={() => appWindow.minimize()}
            title="Minimize"
            className="flex h-10 w-11 items-center justify-center text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => appWindow.toggleMaximize()}
            title={isMaximized ? 'Restore' : 'Maximize'}
            className="flex h-10 w-11 items-center justify-center text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
          >
            {isMaximized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3 w-3" />
            )}
          </button>

          <button
            onClick={() => appWindow.close()}
            title="Close"
            className="flex h-10 w-11 items-center justify-center text-slate-400 transition hover:bg-red-600 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`shrink-0 overflow-x-auto overflow-y-hidden border-r border-slate-800 transition-all duration-200 ${sidebarCollapsed ? 'w-10' : 'w-88'}`}
        >
          <Sidebar />
        </div>

        <div className="min-w-0 flex-1 h-full overflow-hidden">
          <ComparisonArea />
        </div>
      </div>
    </div>
  )
}
