import { useUIStore } from '../../store/uiStore'
import { ComparisonArea } from '../diff/ComparisonArea'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'

export function ResizableLayout(): React.JSX.Element {
  const { sidebarCollapsed } = useUIStore()

  return (
    <div className="flex h-full w-full flex-col bg-slate-950">
      {/* ── Custom title bar ─────────────────────────────────────────────── */}
      <TitleBar />

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`sidebar-wrap shrink-0 overflow-x-auto overflow-y-hidden border-r border-slate-800 transition-all duration-200 ${sidebarCollapsed ? 'w-10' : 'w-88'}`}
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
