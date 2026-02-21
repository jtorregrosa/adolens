import { forwardRef, useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Lock,
  LockOpen,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  ChevronsRight,
  ChevronsLeft,
  Loader2,
  Trash2,
  RotateCcw,
  Plus,
  CloudUpload
} from 'lucide-react'
import type { DiffVariableRow, AdoVariableGroup, DraftNewVariable, PendingChange } from '../../types'
import { useUIStore } from '../../store/uiStore'
import { Tooltip } from '../ui/Tooltip'
import { AppContextMenu } from '../ui/AppContextMenu'
import type { ContextMenuItem } from '../ui/AppContextMenu'
import { NewPropertyRow } from './NewPropertyRow'

interface Props {
  side: 'left' | 'right'
  rows: DiffVariableRow[]
  isLoading: boolean
  otherGroup: AdoVariableGroup | undefined
  /** Opens the PushReviewModal for this pane. */
  onOpenReview: () => void
  /**
   * Increment this value from outside to force-clear all local pending
   * changes (e.g. after a discard or a successful push).
   */
  clearToken: number
  /** Locally-drafted new variables (not yet in ADO). Rendered in-place in the diff by key. */
  addedVars?: DraftNewVariable[]
  /** Trigger adding a new variable (called by the inline footer row). */
  onAddVar?: () => void
  /** Remove a locally-drafted variable by key. */
  onDeleteNewVar?: (key: string) => void
  /** Update a locally-drafted variable (oldKey for renames, value). */
  onUpdateNewVar?: (oldKey: string, newKey: string, value: string) => void
  /** Keys of existing cloud variables staged for local deletion. */
  deletedKeys?: string[]
  /** Stage an existing cloud variable for deletion. */
  onDeleteVar?: (key: string) => void
  /** Remove a variable that only exists as a pending add (e.g. from copy). No staged deletion. */
  onRemoveLocalVar?: (key: string) => void
  /** Restore a variable previously staged for deletion. */
  onRestoreVar?: (key: string) => void
  /** Discard all local changes for this pane (edits, added vars, deleted keys). */
  onDiscard?: () => void
  /**
   * True when the opposite pane has pending changes. Used to render an
   * invisible spacer so both panes stay vertically aligned.
   */
  peerHasChanges?: boolean
  /** Keys that exist in the cloud (ADO) for this pane. Used to show green when a variable was added to this library. */
  cloudKeysForPane?: string[]
  /** When set, scroll to this row (added variable key) and trigger flash animation. */
  scrollToAddedKey?: string | null
}

const SECRET_PLACEHOLDER = '••••••••'

export const DiffTable = forwardRef<HTMLDivElement, Props>(function DiffTable(
  { side, rows, isLoading, otherGroup, onOpenReview, clearToken, addedVars = [], onAddVar, onDeleteNewVar, onUpdateNewVar, deletedKeys = [], onDeleteVar, onRemoveLocalVar, onRestoreVar, onDiscard, peerHasChanges = false, cloudKeysForPane = [], scrollToAddedKey = null },
  ref
) {
  const addedRowRef = useRef<HTMLTableRowElement | null>(null)
  type FlashRowType = 'added' | 'deleted' | 'renamed' | 'modified' | 'edited'
  const [flashRow, setFlashRow] = useState<{ key: string; type: FlashRowType } | null>(null)
  const { searchQuery, upsertOwnEdit, removeOwnEdit } = useUIStore()
  // Subscribe to own-side edits from Zustand so the notification bar count
  // reflects cross-pane copies that arrive via the global store (not local state).
  const ownEdits = useUIStore((s) => side === 'left' ? s.leftOwnEdits : s.rightOwnEdits)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  // ── Key-name editing ────────────────────────────────────────────────────
  const [editingKeyFor, setEditingKeyFor] = useState<string | null>(null)
  const [editKeyValue, setEditKeyValue] = useState('')
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])

  // When the parent signals a discard or post-push, wipe all local pending state.
  useEffect(() => {
    if (clearToken > 0) {
      setPendingChanges([])
      setEditingKey(null)
      setEditingKeyFor(null)
    }
  }, [clearToken])

  // When scrollToAddedKey or flashRow is set, scroll the row into view and trigger type-specific flash.
  useEffect(() => {
    const key = scrollToAddedKey ?? flashRow?.key
    const flashType: FlashRowType = scrollToAddedKey ? 'added' : flashRow?.type ?? 'added'
    if (!key) return
    const el = addedRowRef.current
    if (!el) return
    const flashClass = `diff-row-flash-${flashType}`
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        el.classList.add(flashClass)
        setTimeout(() => el.classList.remove(flashClass), 1300)
      })
    })
    if (flashRow) {
      const clear = setTimeout(() => setFlashRow(null), 1600)
      return () => {
        cancelAnimationFrame(t)
        clearTimeout(clear)
      }
    }
    return () => cancelAnimationFrame(t)
  }, [scrollToAddedKey, flashRow])

  const startEdit = useCallback((key: string, currentValue: string | undefined) => {
    // Cancel any in-progress key rename before starting a value edit.
    setEditingKeyFor(null)
    setEditingKey(key)
    setEditValue(currentValue ?? '')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingKey(null)
    setEditValue('')
  }, [])

  const startKeyEdit = useCallback((originalKey: string) => {
    // If currently editing a value, close it first.
    setEditingKey(null)
    const existingRename = ownEdits.find((e) => e.key === originalKey && e.newKey)
    setEditKeyValue(existingRename?.newKey ?? originalKey)
    setEditingKeyFor(originalKey)
  }, [ownEdits])

  const cancelKeyEdit = useCallback(() => {
    setEditingKeyFor(null)
    setEditKeyValue('')
  }, [])

  const commitKeyEdit = useCallback(
    (originalKey: string, variable: { value?: string; isSecret?: boolean } | undefined | null, takenKeys: Set<string>) => {
      const trimmed = editKeyValue.trim()
      if (!trimmed || (takenKeys.has(trimmed) && trimmed !== originalKey)) {
        // Invalid — cancel without saving.
        cancelKeyEdit()
        return
      }

      const currentPendingEdit = ownEdits.find((e) => e.key === originalKey)
      const currentValue = currentPendingEdit?.newValue ?? variable?.value ?? ''
      const isKeyChanged = trimmed !== originalKey
      const isValueChanged =
        currentPendingEdit?.newValue !== undefined &&
        currentPendingEdit?.newValue !== (variable?.value ?? '')

      if (isKeyChanged || isValueChanged) {
        const change: PendingChange = {
          key: originalKey,
          side,
          originalValue: variable?.value,
          newValue: currentValue,
          ...(isKeyChanged ? { newKey: trimmed } : {}),
          ...(currentPendingEdit?.isSecret !== undefined ? { isSecret: currentPendingEdit.isSecret } : {})
        }
        setPendingChanges((prev) => {
          const without = prev.filter((c) => !(c.key === originalKey && c.side === side))
          return [...without, change]
        })
        upsertOwnEdit(side, change)
        setFlashRow({ key: trimmed, type: 'renamed' })
      } else {
        // Both key and value are back to their cloud state — remove any pending change.
        setPendingChanges((prev) => prev.filter((c) => !(c.key === originalKey && c.side === side)))
        removeOwnEdit(side, originalKey)
      }

      setEditingKeyFor(null)
    },
    [editKeyValue, ownEdits, side, upsertOwnEdit, removeOwnEdit, cancelKeyEdit]
  )

  const commitEdit = useCallback(
    (key: string, originalValue: string | undefined, variable?: { value?: string; isSecret?: boolean } | null) => {
      const existingEdit = ownEdits.find((e) => e.key === key)
      const existingRename = existingEdit?.newKey
      const isSecret = existingEdit?.isSecret ?? variable?.isSecret ?? false
      if (editValue !== (originalValue ?? '') || existingRename) {
        const change: PendingChange = {
          key,
          side,
          originalValue,
          newValue: editValue,
          ...(existingRename ? { newKey: existingRename } : {}),
          ...(isSecret ? { isSecret: true } : existingEdit?.isSecret !== undefined ? { isSecret: existingEdit.isSecret } : {})
        }
        setPendingChanges((prev) => {
          const without = prev.filter((c) => !(c.key === key && c.side === side))
          return [...without, change]
        })
        // Mirror to global store so PaneActionBar can observe unsaved state
        upsertOwnEdit(side, change)
        setFlashRow({ key, type: 'edited' })
      } else {
        // Edit reverted to original — remove from store if present
        removeOwnEdit(side, key)
      }
      setEditingKey(null)
    },
    [editValue, ownEdits, side, upsertOwnEdit, removeOwnEdit]
  )

  const copyRowToOtherSide = useCallback(
    (key: string, value: string | undefined, isSecret?: boolean) => {
      const targetSide = side === 'left' ? 'right' : 'left'
      const newValue = isSecret ? '' : (value ?? '')
      const change: PendingChange = {
        key,
        side: targetSide,
        originalValue: undefined,
        newValue,
        ...(isSecret ? { isSecret: true } : {})
      }
      upsertOwnEdit(targetSide, change)
    },
    [side, upsertOwnEdit]
  )

  const setRowSecret = useCallback(
    (key: string, isSecret: boolean, variable: { value?: string; isSecret?: boolean } | undefined | null) => {
      const existing = ownEdits.find((e) => e.key === key)
      const currentValue = existing?.newValue ?? variable?.value ?? ''
      // When removing secret, clear the value in the table (ADO does not expose secret values; we send empty).
      const newValue = isSecret ? currentValue : ''
      const change: PendingChange = {
        key,
        side,
        originalValue: variable?.value,
        newValue,
        ...(existing?.newKey ? { newKey: existing.newKey } : {}),
        isSecret
      }
      setPendingChanges((prev) => {
        const without = prev.filter((c) => !(c.key === key && c.side === side))
        return [...without, change]
      })
      upsertOwnEdit(side, change)
    },
    [side, ownEdits, upsertOwnEdit]
  )

  const bulkSyncAll = useCallback(() => {
    const newChanges: PendingChange[] = []
    const targetSide = side === 'left' ? 'right' : 'left'
    for (const row of rows) {
      if (row.status === 'ghost' || row.status === 'identical') continue
      const sourceVar = side === 'left' ? row.left : row.right
      if (!sourceVar || sourceVar.isSecret) continue
      newChanges.push({
        key: row.key,
        side: targetSide,
        originalValue: undefined,
        newValue: sourceVar.value ?? ''
      })
    }
    // Only push into the global store for the TARGET pane.
    for (const change of newChanges) {
      upsertOwnEdit(targetSide, change)
    }
  }, [rows, side, upsertOwnEdit])

  // Cloud-side keys for duplicate validation in NewPropertyRow.
  // Exclude keys that are already tracked as addedVars so the "NEW" badge rows
  // don't incorrectly trigger a duplicate warning against themselves.
  const addedVarKeys = addedVars.map((v) => v.key)
  const addedVarKeySet = new Set(addedVarKeys)
  const addedVarByKey = new Map(addedVars.map((v) => [v.key, v]))
  const deletedKeySet = new Set(deletedKeys)
  const cloudKeys = rows.map((r) => r.key).filter((k) => !addedVarKeySet.has(k))
  const cloudKeysForPaneSet = new Set(cloudKeysForPane)

  // Same row order on both panes (by key); added vars rendered in-place as NewPropertyRow.
  const filteredRows = searchQuery
    ? rows.filter((r) => r.key.toLowerCase().includes(searchQuery.toLowerCase()))
    : rows

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  const pendingCount = pendingChanges.filter((c) => c.side === (side === 'left' ? 'right' : 'left')).length
  // Total: own-side edits from Zustand (includes copies FROM the other pane) +
  // locally-added variables + staged deletions.
  const totalPendingCount = ownEdits.length + addedVars.length + deletedKeys.length

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Pending changes bar — or muted spacer when peer pane has changes */}
      {totalPendingCount > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex h-8 shrink-0 items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 text-xs text-amber-400"
        >
          <span className="font-semibold">{totalPendingCount} pending change(s)</span>
          <button
            onClick={onOpenReview}
            className="ml-auto flex items-center gap-1.5 rounded bg-amber-500/20 px-2 py-0.5 font-medium transition hover:bg-amber-500/30"
          >
            <CloudUpload className="h-3.5 w-3.5" />
            Review &amp; Push
          </button>
          <button
            onClick={() => onDiscard?.()}
            className="flex items-center gap-1.5 rounded border border-red-800/50 bg-red-900/20 px-2 py-0.5 font-medium text-red-400 transition hover:bg-red-900/40 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Discard
          </button>
        </motion.div>
      ) : peerHasChanges ? (
        <div className="flex h-8 shrink-0 items-center border-b border-slate-800/60 bg-slate-900/40 px-4 text-xs text-slate-600">
          <span className="font-semibold">0 pending change(s)</span>
        </div>
      ) : null}

      {/* Bulk sync toolbar */}
      {otherGroup && (
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-1 text-xs">
          <span className="text-slate-600">Bulk:</span>
          <button
            onClick={bulkSyncAll}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
          >
            {side === 'left' ? (
              <>
                <ChevronsRight className="h-3.5 w-3.5" />
                Sync All → Right
              </>
            ) : (
              <>
                <ChevronsLeft className="h-3.5 w-3.5" />
                Sync All ← Left
              </>
            )}
          </button>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-amber-400">
              {pendingCount}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div
        ref={ref}
        className="flex-1 overflow-auto"
        style={side === 'left' ? { direction: 'rtl' } : undefined}
      >
        <table className="diff-table w-full border-collapse" style={{ direction: 'ltr' }}>
          <thead className="sticky top-0 z-10 bg-slate-900">
            <tr>
              {/* Left pane outer edge: delete column */}
              {side === 'left' && (
                <th className="sticky left-0 z-20 w-10 border-b border-slate-800 bg-slate-900" />
              )}
              {/* Right pane near separator: copy column */}
              {side === 'right' && (
                <th className="sticky left-0 z-20 w-10 border-b border-slate-800 bg-slate-900" />
              )}
              <th className="w-5/12 border-b border-slate-800 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Key
              </th>
              <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Value
              </th>
              {/* Left pane near separator: copy column */}
              {side === 'left' && (
                <th className="sticky right-0 z-20 w-10 border-b border-slate-800 bg-slate-900" />
              )}
              {/* Right pane outer edge: delete column */}
              {side === 'right' && (
                <th className="sticky right-0 z-20 w-10 border-b border-slate-800 bg-slate-900" />
              )}
            </tr>
          </thead>
          <tbody>
            {/* Cloud rows + added vars in-place by key (same row order on both panes) */}
            {filteredRows.map((row, idx) => {
              const addedVar = addedVarByKey.get(row.key)
              if (addedVar) {
                return (
                  <NewPropertyRow
                    key={addedVar.key}
                    ref={scrollToAddedKey === addedVar.key || flashRow?.key === addedVar.key ? addedRowRef : undefined}
                    side={side}
                    variable={addedVar}
                    existingKeys={addedVarKeys}
                    cloudKeys={cloudKeys}
                    onUpdate={(oldKey, newKey, value) => onUpdateNewVar?.(oldKey, newKey, value)}
                    onDelete={(key) => onDeleteNewVar?.(key)}
                  />
                )
              }
              const variable = side === 'left' ? row.left : row.right
              const isDeleted = deletedKeySet.has(row.key)
              const isEditing = !isDeleted && editingKey === row.key
              const isEditingKeyName = !isDeleted && editingKeyFor === row.key
              const pending = pendingChanges.find((c) => c.key === row.key && c.side === side)
              const displayValue = pending?.newValue ?? variable?.value

              // Compute the effective display key (renamed or original).
              // After rename, effective vars use the new key, so the diff row has row.key = newKey; find edit by old or new key.
              const renamedEdit =
                ownEdits.find((e) => e.key === row.key && e.newKey && e.newKey !== e.key) ??
                ownEdits.find((e) => e.newKey === row.key && e.newKey !== e.key)
              const displayKey = renamedEdit?.newKey ?? row.key
              const isKeyRenamed = !!renamedEdit

              // Keys that are already occupied (for rename validation).
              const takenKeys = new Set<string>([
                ...cloudKeys.filter((k) => k !== row.key),
                ...addedVarKeys,
                ...ownEdits.filter((e) => e.key !== row.key && e.newKey).map((e) => e.newKey!)
              ])
              const keyInputInvalid =
                isEditingKeyName &&
                (editKeyValue.trim() === '' ||
                  (takenKeys.has(editKeyValue.trim()) && editKeyValue.trim() !== row.key))

              const showCopyButton =
                !isDeleted &&
                !!variable &&
                row.status !== 'ghost' &&
                row.status !== 'identical' &&
                !!otherGroup

              const canDelete = !!variable && row.status !== 'ghost'
              const isInCloud = cloudKeysForPaneSet.has(row.key)
              const effectiveSecret = ownEdits.find((e) => e.key === row.key)?.isSecret ?? variable?.isSecret ?? false

              const handleRemoveOrDelete = (): void => {
                if (isDeleted) {
                  onRestoreVar?.(row.key)
                  setFlashRow({ key: row.key, type: 'modified' })
                } else if (isInCloud) {
                  onDeleteVar?.(row.key)
                  setFlashRow({ key: row.key, type: 'deleted' })
                } else {
                  onRemoveLocalVar?.(row.key)
                  setFlashRow({ key: row.key, type: 'added' })
                }
              }

              const rowMenuItems: ContextMenuItem[] = [
                ...(canDelete
                  ? [
                      {
                        label: isDeleted ? 'Restore variable' : isInCloud ? 'Delete variable' : 'Remove (undo add)',
                        icon: isDeleted ? <RotateCcw className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />,
                        variant: (isDeleted ? 'default' : 'danger') as 'default' | 'danger',
                        onSelect: handleRemoveOrDelete
                      }
                    ]
                  : []),
                {
                  label: 'Copy to Left',
                  icon: <ArrowLeft className="h-3.5 w-3.5" />,
                  disabled: side === 'left' || !variable || isDeleted,
                  onSelect: () => copyRowToOtherSide(row.key, variable?.value, variable?.isSecret)
                },
                {
                  label: 'Copy to Right',
                  icon: <ArrowRight className="h-3.5 w-3.5" />,
                  disabled: side === 'right' || !variable || isDeleted,
                  onSelect: () => copyRowToOtherSide(row.key, variable?.value, variable?.isSecret)
                },
                {
                  label: effectiveSecret ? 'Remove secret' : 'Set as secret',
                  icon: effectiveSecret ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />,
                  disabled: !variable || isDeleted,
                  dividerBefore: true,
                  onSelect: () => setRowSecret(row.key, !effectiveSecret, variable)
                }
              ]

              // Copy button — always near the separator
              const copyCell = (
                <td
                  className={`w-10 px-1 py-2 ${
                    side === 'left' ? 'sticky right-0' : 'sticky left-0'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {showCopyButton ? (
                      <Tooltip content={`Copy to ${side === 'left' ? 'Right' : 'Left'}${variable?.isSecret ? ' (value will be empty)' : ''}`} side={side === 'left' ? 'right' : 'left'}>
                        <button
                          onClick={() => copyRowToOtherSide(row.key, variable?.value, variable?.isSecret)}
                          className="rounded p-1 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
                        >
                          {side === 'left' ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                        </button>
                      </Tooltip>
                    ) : (
                      <button className="invisible rounded p-1">
                        {side === 'left' ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </td>
              )

              // Delete/restore/remove button — always on the outer edge (away from separator)
              const deleteCell = (
                <td
                  className={`w-10 px-1 py-2 ${
                    side === 'left' ? 'sticky left-0' : 'sticky right-0'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {canDelete && (
                      isDeleted ? (
                        <Tooltip content="Restore variable" side={side === 'left' ? 'left' : 'right'}>
                          <button
                            onClick={() => onRestoreVar?.(row.key)}
                            className="rounded p-1 text-red-500 transition hover:bg-red-500/10 hover:text-red-400"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip content={isInCloud ? 'Delete variable' : 'Remove (undo add)'} side={side === 'left' ? 'left' : 'right'}>
                          <button
                            onClick={handleRemoveOrDelete}
                            className="rounded p-1 text-transparent transition group-hover:text-slate-600 hover:!text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Tooltip>
                      )
                    )}
                  </div>
                </td>
              )

              const effectiveStatus: DiffVariableRow['status'] = !variable
                ? 'ghost'
                : ownEdits.some((e) => e.key === row.key) || isKeyRenamed
                  ? 'modified'
                  : otherGroup
                    ? row.status
                    : 'identical'
              const isAddedToThisLibrary = !!variable && !isDeleted && !cloudKeysForPaneSet.has(row.key)
              const hasOwnValueEdit = ownEdits.some((e) => e.key === row.key) && !isKeyRenamed
              const rowHighlightClass = isDeleted
                ? 'diff-row-deleted'
                : isKeyRenamed
                  ? 'diff-row-renamed'
                  : isAddedToThisLibrary
                    ? 'diff-row-added'
                    : effectiveStatus === 'ghost'
                      ? 'diff-row-ghost'
                      : hasOwnValueEdit
                        ? 'diff-row-edited'
                        : effectiveStatus === 'modified'
                          ? 'diff-row-modified'
                          : ''

              return (
                <AppContextMenu key={`${row.key}-${idx}`} items={rowMenuItems}>
                  <tr
                    ref={scrollToAddedKey === row.key || flashRow?.key === row.key ? addedRowRef : undefined}
                    className={`border-b border-slate-800/50 ${rowHighlightClass} group`}
                  >
                  {/* Left pane: delete on outer-left, copy on outer-right (near separator) */}
                  {/* Right pane: copy on outer-left (near separator), delete on outer-right */}
                  {side === 'left' ? deleteCell : copyCell}

                  {/* Key cell — min-h-6 keeps row height consistent with value cell */}
                  <td className="w-5/12 max-w-0 overflow-hidden px-4 py-2 align-middle">
                    {row.status === 'ghost' || !variable ? (
                      <span className="mono block min-h-6 truncate text-sm invisible">&nbsp;</span>
                    ) : isDeleted ? (
                      <Tooltip content={row.key} side="top" delayDuration={800}>
                        <span className="mono selectable block min-h-6 w-fit max-w-full truncate text-sm text-slate-400 line-through">
                          {row.key}
                        </span>
                      </Tooltip>
                    ) : isEditingKeyName ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          className={`selectable mono flex-1 rounded border px-2 py-0.5 text-sm text-white outline-none bg-slate-800 ${
                            keyInputInvalid
                              ? 'border-red-500'
                              : 'border-blue-500'
                          }`}
                          value={editKeyValue}
                          onChange={(e) => setEditKeyValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitKeyEdit(row.key, variable, takenKeys)
                            if (e.key === 'Escape') cancelKeyEdit()
                          }}
                        />
                        <button
                          onClick={() => commitKeyEdit(row.key, variable, takenKeys)}
                          disabled={keyInputInvalid}
                          className="rounded p-0.5 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-30"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={cancelKeyEdit}
                          className="rounded p-0.5 text-red-400 hover:bg-red-400/10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Tooltip content={isKeyRenamed ? `${row.key} → ${displayKey}` : displayKey} side="top" delayDuration={800}>
                        <span
                          className={`mono selectable block min-h-6 w-fit max-w-full cursor-text truncate rounded text-sm text-slate-300 ${
                            isKeyRenamed ? 'font-bold' : ''
                          }`}
                          onClick={() => !isDeleted && startKeyEdit(row.key)}
                        >
                          {displayKey}
                        </span>
                      </Tooltip>
                    )}
                  </td>

                  {/* Value cell — min-h-6 keeps row height consistent */}
                  <td className="max-w-0 overflow-hidden px-4 py-2 align-middle">
                    {row.status === 'ghost' || !variable ? (
                      <span className="mono block min-h-6 truncate text-sm invisible">&nbsp;</span>
                    ) : isDeleted ? (
                      <span className="mono block min-h-6 truncate text-sm text-slate-400 line-through">
                        {variable.isSecret ? SECRET_PLACEHOLDER : (variable.value || <span className="text-slate-500 italic">empty</span>)}
                      </span>
                    ) : effectiveSecret ? (
                      <Tooltip content="Click to set or change secret value" side="top" delayDuration={800}>
                        <div
                          className="flex min-h-6 cursor-text items-center gap-1.5 rounded text-slate-500 hover:text-slate-400"
                          onClick={() => startEdit(row.key, undefined)}
                        >
                          <Lock className="h-3 w-3 shrink-0" />
                          <span className="mono text-sm">{SECRET_PLACEHOLDER}</span>
                        </div>
                      </Tooltip>
                    ) : isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          className="selectable mono flex-1 rounded border border-blue-500 bg-slate-800 px-2 py-0.5 text-sm text-white outline-none"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(row.key, variable?.value)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                        <button
                          onClick={() => commitEdit(row.key, variable?.value)}
                          className="rounded p-0.5 text-emerald-400 hover:bg-emerald-400/10"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded p-0.5 text-red-400 hover:bg-red-400/10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Tooltip content={displayValue != null && displayValue !== '' ? displayValue : '(empty)'} side="top" delayDuration={800}>
                        <span
                          className={`mono selectable block min-h-6 w-full min-w-0 cursor-text truncate rounded text-sm text-slate-300 py-0.5 ${
                            ownEdits.some((e) => e.key === row.key) || (otherGroup && row.status === 'modified') ? 'font-bold' : ''
                          }`}
                          onClick={() => startEdit(row.key, displayValue)}
                        >
                          {displayValue != null && displayValue !== '' ? displayValue : <span className="text-slate-600 italic">empty</span>}
                        </span>
                      </Tooltip>
                    )}
                  </td>

                  {side === 'left' ? copyCell : deleteCell}
                </tr>
                </AppContextMenu>
              )
            })}


            {/* Inline “Add variable” footer row */}
            {onAddVar && (
              <tr
                onClick={onAddVar}
                className="cursor-pointer border-t border-white/5 hover:bg-emerald-950/20 transition-colors group/add"
              >
                {/* outer-left cell */}
                <td className="w-10 bg-slate-950 sticky left-0" />
                {/* key cell */}
                <td className="w-5/12 px-4 py-2">
                  <span className="flex items-center gap-1.5 text-xs text-slate-600 group-hover/add:text-emerald-400 transition-colors select-none">
                    <Plus className="h-3.5 w-3.5" />
                    Add variable
                  </span>
                </td>
                {/* value cell */}
                <td />
                {/* outer-right cell */}
                <td className="w-10 bg-slate-950 sticky right-0" />
              </tr>
            )}
          </tbody>
        </table>

        {filteredRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <p className="text-sm">No variables to display</p>
          </div>
        )}
      </div>

    </div>
  )
})
