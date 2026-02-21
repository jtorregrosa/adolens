import { useState, useEffect } from 'react'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { GripVertical, ArrowLeftRight, Merge, RefreshCw, Unplug } from 'lucide-react'
import { Tooltip } from '../ui/Tooltip'
import { toast } from 'sonner'
import type { AdoVariable } from '../../types'
import { useUIStore } from '../../store/uiStore'
import { useVariableGroup, useUpdateVariableGroup } from '../../hooks/useADOApi'
import { useVariableDiff } from '../../hooks/useVariableDiff'
import { useVariableBuffer } from '../../hooks/useVariableBuffer'
import { useSyncScroll } from '../../hooks/useSyncScroll'
import { DiffTable } from './DiffTable'
import { PaneHeader } from './PaneHeader'
import { EmptyPane } from './EmptyPane'
import { DiffStats } from './DiffStats'
import { PaneActionBar } from './PaneActionBar'
import { PushReviewModal } from '../modals/PushReviewModal'

export function ComparisonArea(): React.JSX.Element {
  const {
    leftPane,
    rightPane,
    syncScroll,
    setSyncScroll,
    clearOwnEdits,
    upsertOwnEdit,
    removeOwnEdit,
    clearAddedVars,
    upsertAddedVar,
    removeAddedVar,
    clearDeletedKeys,
    markDeleted,
    unmarkDeleted,
    clearPanes
  } = useUIStore()

  // Use fine-grained selectors so the component re-renders exactly when these
  // arrays change — avoids any potential stale-closure issue with the whole
  // store subscription.
  const leftOwnEdits = useUIStore((s) => s.leftOwnEdits)
  const rightOwnEdits = useUIStore((s) => s.rightOwnEdits)
  const leftAddedVars = useUIStore((s) => s.leftAddedVars)
  const rightAddedVars = useUIStore((s) => s.rightAddedVars)
  const leftDeletedKeys = useUIStore((s) => s.leftDeletedKeys)
  const rightDeletedKeys = useUIStore((s) => s.rightDeletedKeys)

  // Which pane's review modal is currently open (null = closed)
  const [reviewSide, setReviewSide] = useState<'left' | 'right' | null>(null)

  // Increment to signal DiffTable to clear its local pendingChanges state.
  const [leftClearToken, setLeftClearToken] = useState(0)
  const [rightClearToken, setRightClearToken] = useState(0)

  // Scroll to and flash the row when a variable was just added (cleared after delay).
  const [scrollToAddedKeyLeft, setScrollToAddedKeyLeft] = useState<string | null>(null)
  const [scrollToAddedKeyRight, setScrollToAddedKeyRight] = useState<string | null>(null)
  useEffect(() => {
    const key = scrollToAddedKeyLeft ?? scrollToAddedKeyRight
    if (!key) return
    const t = setTimeout(() => {
      setScrollToAddedKeyLeft((k) => (k === key ? null : k))
      setScrollToAddedKeyRight((k) => (k === key ? null : k))
    }, 2500)
    return () => clearTimeout(t)
  }, [scrollToAddedKeyLeft, scrollToAddedKeyRight])

  function discardSide(side: 'left' | 'right'): void {
    clearOwnEdits(side)
    clearAddedVars(side)
    clearDeletedKeys(side)
    if (side === 'left') setLeftClearToken((t) => t + 1)
    else setRightClearToken((t) => t + 1)
  }

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

  // Merges cloud variables with locally-pending edits + added draft vars for the diff engine.
  // Applies renames (old key removed, new key set) so the diff aligns correctly.
  function buildEffectiveVars(
    cloud: Record<string, AdoVariable>,
    ownEdits: typeof leftOwnEdits,
    addedVars: typeof leftAddedVars
  ): Record<string, AdoVariable> {
    const out: Record<string, AdoVariable> = { ...cloud }
    for (const e of ownEdits) {
      const isSecret = cloud[e.key]?.isSecret ?? false
      const entry = { value: e.newValue, isSecret }
      if (e.newKey && e.newKey !== e.key) {
        delete out[e.key]
        out[e.newKey] = entry
      } else {
        out[e.key] = entry
      }
    }
    for (const v of addedVars) {
      out[v.key] = { value: v.value, isSecret: false }
    }
    return out
  }
  const leftEffectiveVars = leftGroup?.variables
    ? buildEffectiveVars(leftGroup.variables, leftOwnEdits, leftAddedVars)
    : leftGroup?.variables
  const rightEffectiveVars = rightGroup?.variables
    ? buildEffectiveVars(rightGroup.variables, rightOwnEdits, rightAddedVars)
    : rightGroup?.variables

  const diff = useVariableDiff(leftEffectiveVars, rightEffectiveVars)
  const { leftRef, rightRef } = useSyncScroll(syncScroll)
  const updateMutation = useUpdateVariableGroup()

  // ─ Local draft buffers (cloud state merged with user edits + added vars) ──────
  const leftBuffer = useVariableBuffer(leftGroup?.variables, leftOwnEdits, leftAddedVars, leftDeletedKeys)
  const rightBuffer = useVariableBuffer(rightGroup?.variables, rightOwnEdits, rightAddedVars, rightDeletedKeys)

  // Pending counts used to show the notification bar spacer in the opposite pane.
  const leftPendingCount = leftOwnEdits.length + leftAddedVars.length + leftDeletedKeys.length
  const rightPendingCount = rightOwnEdits.length + rightAddedVars.length + rightDeletedKeys.length

  const hasLeft = !!leftPane.groupId
  const hasRight = !!rightPane.groupId
  const hasBoth = hasLeft && hasRight

  /**
   * Execute the actual PUT request after the user has confirmed in the modal
   * Called by onConfirmPush in PushReviewModal.
   */
  async function executePush(
    side: 'left' | 'right',
    variables: Record<string, { value: string; isSecret: boolean }>
  ): Promise<void> {
    const pane = side === 'left' ? leftPane : rightPane
    if (!pane.projectId || !pane.groupId) throw new Error('No group is loaded in this pane')

    await updateMutation.mutateAsync({
      projectId: pane.projectId,
      groupId: pane.groupId,
      variables
    })

    clearOwnEdits(side)
    clearAddedVars(side)
    clearDeletedKeys(side)
    if (side === 'left') { refetchLeft(); setLeftClearToken((t) => t + 1) }
    else { refetchRight(); setRightClearToken((t) => t + 1) }
  }

  function handleAddVar(side: 'left' | 'right'): void {
    // Generate a unique placeholder key, avoiding collisions with cloud and existing added vars
    const cloudKeys = new Set([
      ...Object.keys((side === 'left' ? leftGroup : rightGroup)?.variables ?? {}),
      ...(side === 'left' ? leftAddedVars : rightAddedVars).map((v) => v.key)
    ])
    let idx = 1
    let candidate = `new_variable_${idx}`
    while (cloudKeys.has(candidate)) {
      idx++
      candidate = `new_variable_${idx}`
    }
    upsertAddedVar(side, { key: candidate, value: '' })
    if (side === 'left') setScrollToAddedKeyLeft(candidate)
    else setScrollToAddedKeyRight(candidate)
  }

  function handleUpdateNewVar(side: 'left' | 'right', oldKey: string, newKey: string, value: string): void {
    if (oldKey !== newKey) {
      removeAddedVar(side, oldKey)
    }
    upsertAddedVar(side, { key: newKey, value })
  }

  function handleDeleteNewVar(side: 'left' | 'right', key: string): void {
    removeAddedVar(side, key)
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
                onOpenReview={() => setReviewSide('left')}
                clearToken={leftClearToken}
                addedVars={leftAddedVars}
                scrollToAddedKey={scrollToAddedKeyLeft}
                onAddVar={() => handleAddVar('left')}
                onDeleteNewVar={(key) => handleDeleteNewVar('left', key)}
                onUpdateNewVar={(oldKey, newKey, value) => handleUpdateNewVar('left', oldKey, newKey, value)}
                deletedKeys={leftDeletedKeys}
                onDeleteVar={(key) => markDeleted('left', key)}
                onRemoveLocalVar={(key) => removeOwnEdit('left', key)}
                onRestoreVar={(key) => unmarkDeleted('left', key)}
                onDiscard={() => discardSide('left')}
                peerHasChanges={rightPendingCount > 0}
                cloudKeysForPane={leftGroup?.variables ? Object.keys(leftGroup.variables) : []}
              />
            ) : (
              <EmptyPane label="Left" />
            )}
            {hasLeft && (
              <PaneActionBar
                side="left"
                pendingCount={leftBuffer.pendingCount}
                onPush={() => setReviewSide('left')}
                variables={leftGroup?.variables}
                groupName={leftPane.groupName}
                onImport={(vars) => importVariables('left', vars)}
              />
            )}
            {hasBoth && (
              <div className="flex h-8 w-full shrink-0 items-center border-t border-slate-800 px-4">
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
                onOpenReview={() => setReviewSide('right')}
                clearToken={rightClearToken}
                addedVars={rightAddedVars}
                scrollToAddedKey={scrollToAddedKeyRight}
                onAddVar={() => handleAddVar('right')}
                onDeleteNewVar={(key) => handleDeleteNewVar('right', key)}
                onUpdateNewVar={(oldKey, newKey, value) => handleUpdateNewVar('right', oldKey, newKey, value)}
                deletedKeys={rightDeletedKeys}
                onDeleteVar={(key) => markDeleted('right', key)}
                onRemoveLocalVar={(key) => removeOwnEdit('right', key)}
                onRestoreVar={(key) => unmarkDeleted('right', key)}
                onDiscard={() => discardSide('right')}
                peerHasChanges={leftPendingCount > 0}
                cloudKeysForPane={rightGroup?.variables ? Object.keys(rightGroup.variables) : []}
              />
            ) : (
              <EmptyPane label="Right" />
            )}
            {hasRight && (
              <PaneActionBar
                side="right"
                pendingCount={rightBuffer.pendingCount}
                onPush={() => setReviewSide('right')}
                variables={rightGroup?.variables}
                groupName={rightPane.groupName}
                onImport={(vars) => importVariables('right', vars)}
              />
            )}
            {hasBoth && (
              <div className="flex h-8 w-full shrink-0 items-center border-t border-slate-800 px-4">
                <DiffStats stats={diff.stats} side="right" />
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>

      {/* ── Push Review Modals ─────────────────────────────────────────────── */}
      {reviewSide === 'left' && (
        <PushReviewModal
          groupName={leftPane.groupName}
          projectName={leftPane.projectName}
          draftChanges={leftBuffer.draftChanges}
          mergedVariables={leftBuffer.mergedVariables}
          onClose={() => setReviewSide(null)}
          onDiscardAll={() => discardSide('left')}
          onConfirmPush={(vars) => executePush('left', vars)}
        />
      )}
      {reviewSide === 'right' && (
        <PushReviewModal
          groupName={rightPane.groupName}
          projectName={rightPane.projectName}
          draftChanges={rightBuffer.draftChanges}
          mergedVariables={rightBuffer.mergedVariables}
          onClose={() => setReviewSide(null)}
          onDiscardAll={() => discardSide('right')}
          onConfirmPush={(vars) => executePush('right', vars)}
        />
      )}
    </div>
  )
}
