import appIcon from '@renderer/assets/icon.png'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Maximize2, Minus, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const appWindow = getCurrentWindow()

export function TitleBar(): React.JSX.Element {
  const { t } = useTranslation()
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
        <img src={appIcon} alt={t('app.titleBar')} className="h-4 w-4 shrink-0" draggable={false} />
        <span className="text-xs font-semibold tracking-wide text-slate-400">
          {t('app.titleBar')}
        </span>
      </div>

      {/* Window control buttons — sit on top, always interactive */}
      <div className="relative ml-auto flex items-center">
        <button
          onClick={() => appWindow.minimize()}
          title={t('titleBar.minimize')}
          className="flex h-10 w-11 items-center justify-center text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => appWindow.toggleMaximize()}
          title={isMaximized ? t('titleBar.restore') : t('titleBar.maximize')}
          className="flex h-10 w-11 items-center justify-center text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
        >
          {isMaximized ? <Maximize2 className="h-3.5 w-3.5" /> : <Square className="h-3 w-3" />}
        </button>

        <button
          onClick={() => appWindow.close()}
          title={t('titleBar.close')}
          className="flex h-10 w-11 items-center justify-center text-slate-400 transition hover:bg-red-600 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
