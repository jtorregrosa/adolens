import { Sidebar } from './Sidebar'
import { ComparisonArea } from '../diff/ComparisonArea'
import { useUIStore } from '../../store/uiStore'
import appIcon from '@resources/icon.png'

export function ResizableLayout(): React.JSX.Element {
  const { sidebarCollapsed } = useUIStore()

  return (
    <div className="flex h-full w-full flex-col bg-slate-950">
      {/* Title bar / drag region — native overlay buttons sit on the right */}
      <div
        className="flex h-12 w-full shrink-0 items-center gap-2 bg-slate-900 border-b border-slate-800 px-4"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <img src={appIcon} alt="ADOLens" className="h-5 w-5 shrink-0 select-none" draggable={false} />
        <span className="select-none text-sm font-semibold tracking-wide text-slate-300">
          ADOLens
        </span>
      </div>

      {/* Main layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar — width driven by collapsed state */}
        <div
          className={`shrink-0 overflow-x-auto overflow-y-hidden border-r border-slate-800 transition-all duration-200 ${sidebarCollapsed ? 'w-10' : 'w-88'}`}
        >
          <Sidebar />
        </div>

        {/* Comparison area with its own internal resizable left/right panes */}
        <div className="min-w-0 flex-1 h-full overflow-hidden">
          <ComparisonArea />
        </div>
      </div>
    </div>
  )
}
