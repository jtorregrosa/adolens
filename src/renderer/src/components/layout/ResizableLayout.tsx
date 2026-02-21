import { Sidebar } from './Sidebar'
import { ComparisonArea } from '../diff/ComparisonArea'
import { useUIStore } from '../../store/uiStore'

export function ResizableLayout(): React.JSX.Element {
  const { sidebarCollapsed } = useUIStore()

  return (
    <div className="flex h-full w-full flex-col bg-slate-950">
      {/* Spacer for native titleBarOverlay (min/max/close controls).
          Must match titleBarOverlay.height (48px = h-12) in main/index.ts.
          Also acts as the drag region for the sidebar area. */}
      <div
        className="h-12 w-full shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

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
