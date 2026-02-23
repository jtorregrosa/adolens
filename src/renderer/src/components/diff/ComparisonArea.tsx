import {
  ArrowLeftRight,
  Bot,
  GripVertical,
  Info,
  MoreHorizontal,
  Settings,
  Trash2,
  Unplug
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  useGroupRef
} from 'react-resizable-panels'
import { toast } from 'sonner'
import { useUpdateVariableGroup, useVariableGroup } from '../../hooks/useADOApi'
import { useSyncScroll } from '../../hooks/useSyncScroll'
import { useVariableBuffer } from '../../hooks/useVariableBuffer'
import { useVariableDiff } from '../../hooks/useVariableDiff'
import type { UserProfile } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import type { AdoVariable } from '../../types'
import { AiModal } from '../ai/AiModal'
import { AboutModal } from '../modals/AboutModal'
import { PushReviewModal } from '../modals/PushReviewModal'
import { SettingsModal } from '../modals/SettingsModal'
import { AppDropdownMenu } from '../ui/AppDropdownMenu'
import { Tooltip } from '../ui/Tooltip'
import { DiffStats } from './DiffStats'
import { DiffTable } from './DiffTable'
import { EmptyPane } from './EmptyPane'
import { PaneActionBar } from './PaneActionBar'
import { PaneHeader } from './PaneHeader'

// ─── Profile avatar + popover ─────────────────────────────────────────────────

import * as Popover from '@radix-ui/react-popover'

function ProfileAvatar({ profile }: { profile: UserProfile }): React.JSX.Element {
  const { t } = useTranslation()

  const hasName = profile.displayName.trim().length > 0
  const initials = hasName
    ? profile.displayName
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0] ?? '')
        .join('')
        .toUpperCase()
    : profile.orgName.slice(0, 2).toUpperCase()

  const avatar = profile.avatarDataUrl ? (
    <img
      src={profile.avatarDataUrl}
      alt={t('toolbar.avatarAlt')}
      className="h-7 w-7 rounded-full object-cover"
    />
  ) : (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
      {initials}
    </div>
  )

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="shrink-0 rounded-full ring-1 ring-slate-700 transition hover:ring-blue-500 focus:outline-none">
          {avatar}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className={[
            'z-50 w-64 overflow-hidden rounded-xl border border-slate-700/60',
            'bg-slate-900/95 shadow-2xl backdrop-blur-xl',
            'animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2'
          ].join(' ')}
        >
          {/* Header strip with avatar + name */}
          <div className="flex items-center gap-3 border-b border-slate-700/60 px-4 py-4">
            <div className="shrink-0 rounded-full ring-2 ring-slate-700">
              {profile.avatarDataUrl ? (
                <img
                  src={profile.avatarDataUrl}
                  alt={t('toolbar.avatarAlt')}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              {hasName && (
                <p className="truncate text-sm font-semibold text-slate-100">
                  {profile.displayName}
                </p>
              )}
              {profile.email && <p className="truncate text-xs text-slate-400">{profile.email}</p>}
            </div>
          </div>

          {/* Org row */}
          <div className="px-4 py-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {t('toolbar.organization')}
            </span>
            <p className="mt-0.5 truncate text-sm text-slate-300">{profile.orgName}</p>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ComparisonArea(): React.JSX.Element {
  const profile = useAuthStore((s) => s.profile)
  const {
    leftPane,
    rightPane,
    syncScroll,
    setSyncScroll,
    setLeftPane,
    setRightPane,
    clearOwnEdits,
    upsertOwnEdit,
    removeOwnEdit,
    clearAddedVars,
    upsertAddedVar,
    removeAddedVar,
    clearDeletedKeys,
    markDeleted,
    unmarkDeleted,
    clearPanes,
    swapPanes
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

  const { t } = useTranslation()
  const {
    confirmBeforeDiscard,
    syncScrollEnabled,
    compactMode,
    warnOnSecretOverwrite,
    defaultPaneSplit
  } = useSettingsStore()

  // Initialize sync scroll from persisted setting on first mount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount
  useEffect(() => {
    setSyncScroll(syncScrollEnabled)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive Panel sizes from the pane-split setting.
  const leftDefaultSize = defaultPaneSplit === '60/40' ? 60 : defaultPaneSplit === '40/60' ? 40 : 50
  const rightDefaultSize = 100 - leftDefaultSize

  // Imperative ref so we can call setLayout when the split setting changes.
  // v4 API: setLayout takes a { [panelId]: percentage } map.
  const panelGroupRef = useGroupRef()
  useEffect(() => {
    panelGroupRef.current?.setLayout({
      'left-pane': leftDefaultSize,
      'right-pane': rightDefaultSize
    })
  }, [leftDefaultSize, rightDefaultSize, panelGroupRef])

  // Which pane's review modal is currently open (null = closed)
  const [reviewSide, setReviewSide] = useState<'left' | 'right' | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showAi, setShowAi] = useState(false)
  // When confirmBeforeDiscard is on, holds the pending discard side until confirmed.
  const [discardConfirmSide, setDiscardConfirmSide] = useState<'left' | 'right' | null>(null)

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
    if (confirmBeforeDiscard) {
      setDiscardConfirmSide(side)
      return
    }
    executeDiscard(side)
  }

  function executeDiscard(side: 'left' | 'right'): void {
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
  const leftBuffer = useVariableBuffer(
    leftGroup?.variables,
    leftOwnEdits,
    leftAddedVars,
    leftDeletedKeys
  )
  const rightBuffer = useVariableBuffer(
    rightGroup?.variables,
    rightOwnEdits,
    rightAddedVars,
    rightDeletedKeys
  )

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
    if (side === 'left') {
      refetchLeft()
      setLeftClearToken((t) => t + 1)
    } else {
      refetchRight()
      setRightClearToken((t) => t + 1)
    }
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

  function handleUpdateNewVar(
    side: 'left' | 'right',
    oldKey: string,
    newKey: string,
    value: string
  ): void {
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
    toast.success(t('toolbar.importedVariables', { count }))
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
          {/* Swap panes (pane selections + all local edits in one atomic update) */}
          <Tooltip content={t('toolbar.swapTooltip')} side="bottom">
            <button
              onClick={swapPanes}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {t('toolbar.swap')}
            </button>
          </Tooltip>

          {/* Unload panes */}
          {(hasLeft || hasRight) && (
            <Tooltip content={t('toolbar.unloadTooltip')} side="bottom">
              <button
                onClick={clearPanes}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
              >
                <Unplug className="h-3.5 w-3.5" />
                {t('toolbar.unload')}
              </button>
            </Tooltip>
          )}
        </div>

        {/* Ask AI button */}
        <Tooltip content={t('toolbar.askTooltip')} side="bottom">
          <button
            onClick={() => setShowAi(true)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-blue-400"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <Bot className="h-3.5 w-3.5" />
            {t('toolbar.ask')}
          </button>
        </Tooltip>

        {/* Profile badge + app menu — right-aligned, outside the drag region */}
        <div
          className="ml-auto flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {profile && <ProfileAvatar profile={profile} />}

          <AppDropdownMenu
            items={[
              {
                label: t('appMenu.settings'),
                icon: <Settings className="h-3.5 w-3.5" />,
                onSelect: () => setShowSettings(true)
              },
              {
                label: t('appMenu.about'),
                icon: <Info className="h-3.5 w-3.5" />,
                onSelect: () => setShowAbout(true)
              }
            ]}
          >
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
              aria-label="Open menu"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </AppDropdownMenu>
        </div>
      </div>

      {/* Split view — 450px min width per panel; horizontal scroll when narrow */}
      <div className="min-h-0 flex-1 overflow-x-auto">
        <PanelGroup
          groupRef={panelGroupRef}
          orientation="horizontal"
          className="min-h-0 h-full min-w-[800px]"
        >
          {/* Left / Source */}
          <Panel
            defaultSize={leftDefaultSize}
            minSize={450}
            id="left-pane"
            style={{ minWidth: 450 }}
          >
            <div className="flex h-full min-w-[400px] flex-col border-r border-slate-800">
              <PaneHeader
                side="left"
                projectName={leftPane.projectName}
                groupName={leftPane.groupName}
                hasGroup={hasLeft}
                onUnload={() =>
                  setLeftPane({
                    projectId: null,
                    projectName: null,
                    groupId: null,
                    groupName: null
                  })
                }
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
                  onUpdateNewVar={(oldKey, newKey, value) =>
                    handleUpdateNewVar('left', oldKey, newKey, value)
                  }
                  deletedKeys={leftDeletedKeys}
                  onDeleteVar={(key) => markDeleted('left', key)}
                  onRemoveLocalVar={(key) => removeOwnEdit('left', key)}
                  onRestoreVar={(key) => unmarkDeleted('left', key)}
                  onDiscard={() => discardSide('left')}
                  peerHasChanges={rightPendingCount > 0}
                  cloudKeysForPane={leftGroup?.variables ? Object.keys(leftGroup.variables) : []}
                  compact={compactMode}
                  warnOnSecretOverwrite={warnOnSecretOverwrite}
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
                <div className="flex h-10 w-full shrink-0 items-center border-t border-blue-500/20 bg-blue-500/5 px-4 py-2">
                  <DiffStats
                    stats={diff.stats}
                    side="left"
                    hasGroup={hasLeft}
                    onUnload={() =>
                      setLeftPane({
                        projectId: null,
                        projectName: null,
                        groupId: null,
                        groupName: null
                      })
                    }
                  />
                </div>
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="relative flex w-1.5 items-center justify-center bg-slate-800 transition hover:bg-blue-600">
            <GripVertical className="h-4 w-4 text-slate-600" />
          </PanelResizeHandle>

          {/* Right / Target */}
          <Panel
            defaultSize={rightDefaultSize}
            minSize={450}
            id="right-pane"
            style={{ minWidth: 450 }}
          >
            <div className="flex h-full min-w-[400px] flex-col">
              <PaneHeader
                side="right"
                projectName={rightPane.projectName}
                groupName={rightPane.groupName}
                hasGroup={hasRight}
                onUnload={() =>
                  setRightPane({
                    projectId: null,
                    projectName: null,
                    groupId: null,
                    groupName: null
                  })
                }
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
                  onUpdateNewVar={(oldKey, newKey, value) =>
                    handleUpdateNewVar('right', oldKey, newKey, value)
                  }
                  deletedKeys={rightDeletedKeys}
                  onDeleteVar={(key) => markDeleted('right', key)}
                  onRemoveLocalVar={(key) => removeOwnEdit('right', key)}
                  onRestoreVar={(key) => unmarkDeleted('right', key)}
                  onDiscard={() => discardSide('right')}
                  peerHasChanges={leftPendingCount > 0}
                  cloudKeysForPane={rightGroup?.variables ? Object.keys(rightGroup.variables) : []}
                  compact={compactMode}
                  warnOnSecretOverwrite={warnOnSecretOverwrite}
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
                <div className="flex h-10 w-full shrink-0 items-center border-t border-fuchsia-500/20 bg-fuchsia-500/5 px-4 py-2">
                  <DiffStats
                    stats={diff.stats}
                    side="right"
                    hasGroup={hasRight}
                    onUnload={() =>
                      setRightPane({
                        projectId: null,
                        projectName: null,
                        groupId: null,
                        groupName: null
                      })
                    }
                  />
                </div>
              )}
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* ── AI Modal ───────────────────────────────────────────────────────── */}
      {showAi && (
        <AiModal
          onClose={() => setShowAi(false)}
          onOpenSettings={() => {
            setShowAi(false)
            setShowSettings(true)
          }}
        />
      )}

      {/* ── Settings Modal ─────────────────────────────────────────────────── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── About Modal ────────────────────────────────────────────────────── */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {/* ── Confirm Discard Dialog ─────────────────────────────────────────── */}
      {discardConfirmSide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-700/50 shadow-2xl">
            <div className="mb-1 flex items-center gap-2.5">
              <Trash2 className="h-5 w-5 shrink-0 text-red-400" />
              <h3 className="text-base font-semibold text-white">{t('diff.confirmDiscard')}</h3>
            </div>
            <p className="mt-1 text-sm text-slate-400">{t('diff.confirmDiscardDescription')}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDiscardConfirmSide(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
              >
                {t('diff.confirmDiscardCancel')}
              </button>
              <button
                onClick={() => {
                  executeDiscard(discardConfirmSide)
                  setDiscardConfirmSide(null)
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                {t('diff.confirmDiscardYes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Push Review Modals ─────────────────────────────────────────────── */}
      {reviewSide === 'left' && (
        <PushReviewModal
          groupName={leftPane.groupName}
          projectName={leftPane.projectName}
          draftChanges={leftBuffer.draftChanges}
          mergedVariables={leftBuffer.mergedVariables}
          onClose={() => setReviewSide(null)}
          onDiscardAll={() => executeDiscard('left')}
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
          onDiscardAll={() => executeDiscard('right')}
          onConfirmPush={(vars) => executePush('right', vars)}
        />
      )}
    </div>
  )
}
