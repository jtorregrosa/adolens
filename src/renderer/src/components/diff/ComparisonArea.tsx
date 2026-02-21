import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { GripVertical, ArrowLeftRight, Merge, RefreshCw, Unplug } from 'lucide-react'
import { Tooltip } from '../ui/Tooltip'
import { toast } from 'sonner'
import type { AdoVariable } from '../../types'
import { useUIStore } from '../../store/uiStore'
import { useVariableGroup, useUpdateVariableGroup } from '../../hooks/useADOApi'
import { useVariableDiff } from '../../hooks/useVariableDiff'
import { useSyncScroll } from '../../hooks/useSyncScroll'
import { DiffTable } from './DiffTable'
import { PaneHeader } from './PaneHeader'
import { EmptyPane } from './EmptyPane'
import { DiffStats } from './DiffStats'
import { PaneActionBar } from './PaneActionBar'

export function ComparisonArea(): React.JSX.Element {
  const {
    leftPane,
    rightPane,
    syncScroll,
    setSyncScroll,
    leftOwnEdits,
    rightOwnEdits,
    clearOwnEdits,
    upsertOwnEdit,
    clearPanes
  } = useUIStore()

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
  const updateMutation = useUpdateVariableGroup()

  const hasLeft = !!leftPane.groupId
  const hasRight = !!rightPane.groupId
  const hasBoth = hasLeft && hasRight

  /** Push the current resolved state of a pane (base variables + own inline edits) to Azure. */
  async function pushToAzure(side: 'left' | 'right'): Promise<void> {
    const pane = side === 'left' ? leftPane : rightPane
    const group = side === 'left' ? leftGroup : rightGroup
    const ownEdits = side === 'left' ? leftOwnEdits : rightOwnEdits

    if (!pane.projectId || !pane.groupId || !group) {
      throw new Error('No group is loaded in this pane')
    }

    // Build merged variable map: base + own edits
    const merged: Record<string, { value: string; isSecret: boolean }> = {}
    for (const [key, v] of Object.entries(group.variables)) {
      merged[key] = { value: v.value ?? '', isSecret: v.isSecret ?? false }
    }
    for (const change of ownEdits) {
      const existing = merged[change.key]
      merged[change.key] = { value: change.newValue, isSecret: existing?.isSecret ?? false }
    }

    await updateMutation.mutateAsync({
      projectId: pane.projectId,
      groupId: pane.groupId,
      variables: merged
    })

    clearOwnEdits(side)
  }

  /** Apply imported variables as own edits so user can review and push. */
  function importVariables(side: 'left' | 'right', imported: Record<string, AdoVariable>): void {
    for (const [key, v] of Object.entries(imported)) {
      upsertOwnEdit(side, { key, side, originalValue: undefined, newValue: v.value ?? '' })
    }
    const count = Object.keys(imported).length
    toast.success(`${count} variable${count !== 1 ? 's' : ''} imported — review and push when ready`)
  }


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
          <Tooltip content={syncScroll ? 'Disable synchronized scrolling' : 'Enable synchronized scrolling'} side="bottom">
            <button
              onClick={() => setSyncScroll(!syncScroll)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                syncScroll
                  ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              <Merge className="h-3.5 w-3.5" />
              Sync Scroll
            </button>
          </Tooltip>

          {/* Swap panes */}
          <Tooltip content="Swap Left and Right panes" side="bottom">
            <button
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
          </Tooltip>

          {/* Refresh */}
          <Tooltip content="Refresh both panes" side="bottom">
            <button
              onClick={() => {
                refetchLeft()
                refetchRight()
              }}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </Tooltip>

          {/* Unload panes */}
          {(hasLeft || hasRight) && (
            <Tooltip content="Unload both panes" side="bottom">
              <button
                onClick={clearPanes}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
              >
                <Unplug className="h-3.5 w-3.5" />
                Unload
              </button>
            </Tooltip>
          )}
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
            {hasLeft && (
              <PaneActionBar
                side="left"
                hasUnsavedChanges={leftOwnEdits.length > 0}
                onSync={() => pushToAzure('left')}
                variables={leftGroup?.variables}
                groupName={leftPane.groupName}
                onImport={(vars) => importVariables('left', vars)}
              />
            )}
            {hasBoth && (
              <div className="flex h-8 shrink-0 items-center justify-end border-t border-slate-800 px-4">
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
            {hasRight && (
              <PaneActionBar
                side="right"
                hasUnsavedChanges={rightOwnEdits.length > 0}
                onSync={() => pushToAzure('right')}
                variables={rightGroup?.variables}
                groupName={rightPane.groupName}
                onImport={(vars) => importVariables('right', vars)}
              />
            )}
            {hasBoth && (
              <div className="flex h-8 shrink-0 items-center border-t border-slate-800 px-4">
                <DiffStats stats={diff.stats} side="right" />
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
