import appIcon from '@renderer/assets/icon.png'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Maximize2, Minus, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const appWindow = getCurrentWindow()

export function TitleBar(): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let unlisten: (() => void) | undefined

    appWindow.isMaximized().then(setIsMaximized)

    appWindow
      .onResized(async () => {
        setIsMaximized(await appWindow.isMaximized())
      })
      .then((fn) => {
        unlisten = fn
      })

    return () => {
      unlisten?.()
    }
  }, [])

  return (
    <div className="relative flex h-10 w-full shrink-0 items-center border-b border-slate-800 bg-slate-900">
      {/* Invisible full-width drag region sitting behind everything */}
      <div className="absolute inset-0" data-tauri-drag-region />

      {/* App icon + name — pointer-events-none so clicks fall to drag region */}
      <div className="relative flex select-none items-center gap-2 px-3 pointer-events-none">
        <img src={appIcon} alt="ADOLens" className="h-4 w-4 shrink-0" draggable={false} />
        <span className="text-xs font-semibold tracking-wide text-slate-400">ADOLens</span>
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
          {isMaximized ? <Maximize2 className="h-3.5 w-3.5" /> : <Square className="h-3 w-3" />}
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
  )
}
