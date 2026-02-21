import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { GripVertical, ArrowLeftRight, Merge, RefreshCw } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useVariableGroup } from '../../hooks/useADOApi'
import { useVariableDiff } from '../../hooks/useVariableDiff'
import { useSyncScroll } from '../../hooks/useSyncScroll'
import { DiffTable } from './DiffTable'
import { PaneHeader } from './PaneHeader'
import { EmptyPane } from './EmptyPane'
import { DiffStats } from './DiffStats'

export function ComparisonArea(): React.JSX.Element {
  const { leftPane, rightPane, syncScroll, setSyncScroll } = useUIStore()

  const {
    data: leftGroup,
    isLoading: leftLoading,
    refetch: refetchLeft
  } = useVariableGroup(leftPane.projectId, leftPane.groupId)

  const {
    data: rightGroup,
    isLoading: rightLoading,
    refetch: refetchRight
  } = useVariableGroup(rightPane.projectId, rightPane.groupId)

  const diff = useVariableDiff(leftGroup?.variables, rightGroup?.variables)
  const { leftRef, rightRef } = useSyncScroll(syncScroll)

  const hasLeft = !!leftPane.groupId
  const hasRight = !!rightPane.groupId
  const hasBoth = hasLeft && hasRight


  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Toolbar — also serves as the window drag region */}
      <div
        className="flex h-10 shrink-0 items-center gap-3 border-b border-slate-800 px-4"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* no-drag so all buttons remain clickable; left-aligned */}
        <div
          className="flex items-center gap-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Sync scroll toggle */}
          <button
            onClick={() => setSyncScroll(!syncScroll)}
            title="Toggle synchronized scrolling"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              syncScroll
                ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
            }`}
          >
            <Merge className="h-3.5 w-3.5" />
            Sync Scroll
          </button>

          {/* Swap panes */}
          <button
            title="Swap Left and Right"
            onClick={() => {
              const { setLeftPane, setRightPane, leftPane: lp, rightPane: rp } = useUIStore.getState()
              const tmp = { ...lp }
              setLeftPane({ ...rp })
              setRightPane({ ...tmp })
            }}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Swap
          </button>

          {/* Refresh */}
          <button
            title="Refresh both panes"
            onClick={() => {
              refetchLeft()
              refetchRight()
            }}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>

      {/* Split view */}
      <PanelGroup orientation="horizontal" className="min-h-0 flex-1">
        {/* Left / Source */}
        <Panel defaultSize={50} minSize={30} id="left-pane">
          <div className="flex h-full flex-col border-r border-slate-800">
            <PaneHeader
              side="left"
              projectName={leftPane.projectName}
              groupName={leftPane.groupName}
            />
            {hasLeft ? (
              <DiffTable
                ref={leftRef}
                side="left"
                rows={diff.rows}
                isLoading={leftLoading}
                otherGroup={rightGroup}
              />
            ) : (
              <EmptyPane label="Left" />
            )}
            {hasBoth && (
              <div className="flex h-8 shrink-0 items-center border-t border-slate-800 px-4">
                <DiffStats stats={diff.stats} side="left" />
              </div>
            )}
          </div>
        </Panel>

        <PanelResizeHandle className="relative flex w-1.5 items-center justify-center bg-slate-800 transition hover:bg-blue-600">
          <GripVertical className="h-4 w-4 text-slate-600" />
        </PanelResizeHandle>

        {/* Right / Target */}
        <Panel defaultSize={50} minSize={30} id="right-pane">
          <div className="flex h-full flex-col">
            <PaneHeader
              side="right"
              projectName={rightPane.projectName}
              groupName={rightPane.groupName}
            />
            {hasRight ? (
              <DiffTable
                ref={rightRef}
                side="right"
                rows={diff.rows}
                isLoading={rightLoading}
                otherGroup={leftGroup}
              />
            ) : (
              <EmptyPane label="Right" />
            )}
            {hasBoth && (
              <div className="flex h-8 shrink-0 items-center justify-end border-t border-slate-800 px-4">
                <DiffStats stats={diff.stats} side="right" />
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
