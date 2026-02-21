import { forwardRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  ChevronsRight,
  ChevronsLeft,
  Loader2
} from 'lucide-react'
import type { DiffVariableRow, AdoVariableGroup, PendingChange } from '../../types'
import { useUIStore } from '../../store/uiStore'
import { useUpdateVariableGroup } from '../../hooks/useADOApi'
import { ReviewChangesModal } from '../modals/ReviewChangesModal'

interface Props {
  side: 'left' | 'right'
  rows: DiffVariableRow[]
  isLoading: boolean
  otherGroup: AdoVariableGroup | undefined
}

const SECRET_PLACEHOLDER = '••••••••'

function rowClass(status: DiffVariableRow['status']): string {
  switch (status) {
    case 'ghost':
      return 'diff-row-ghost'
    case 'modified':
      return 'diff-row-modified'
    case 'added':
      return 'diff-row-added'
    case 'removed':
      return 'diff-row-removed'
    default:
      return 'diff-row-identical'
  }
}

export const DiffTable = forwardRef<HTMLDivElement, Props>(function DiffTable(
  { side, rows, isLoading, otherGroup },
  ref
) {
  const { searchQuery, leftPane, rightPane } = useUIStore()
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [showReview, setShowReview] = useState(false)
  const updateMutation = useUpdateVariableGroup()

  const pane = side === 'left' ? leftPane : rightPane

  const startEdit = useCallback((key: string, currentValue: string | undefined) => {
    setEditingKey(key)
    setEditValue(currentValue ?? '')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingKey(null)
    setEditValue('')
  }, [])

  const commitEdit = useCallback(
    (key: string, originalValue: string | undefined) => {
      if (editValue !== (originalValue ?? '')) {
        setPendingChanges((prev) => {
          const without = prev.filter((c) => !(c.key === key && c.side === side))
          return [...without, { key, side, originalValue, newValue: editValue }]
        })
      }
      setEditingKey(null)
    },
    [editValue, side]
  )

  const copyRowToOtherSide = useCallback(
    (key: string, value: string | undefined) => {
      if (value === undefined) return
      const targetSide = side === 'left' ? 'right' : 'left'
      setPendingChanges((prev) => {
        const without = prev.filter((c) => !(c.key === key && c.side === targetSide))
        return [...without, { key, side: targetSide, originalValue: undefined, newValue: value }]
      })
    },
    [side]
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
    setPendingChanges((prev) => {
      const withoutOverwritten = prev.filter(
        (c) => !newChanges.some((n) => n.key === c.key && n.side === c.side)
      )
      return [...withoutOverwritten, ...newChanges]
    })
  }, [rows, side])

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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Pending changes bar */}
      {pendingChanges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-400"
        >
          <span className="font-semibold">{pendingChanges.length} pending change(s)</span>
          <button
            onClick={() => setShowReview(true)}
            className="ml-auto rounded bg-amber-500/20 px-2 py-0.5 font-medium transition hover:bg-amber-500/30"
          >
            Review &amp; Commit
          </button>
          <button onClick={() => setPendingChanges([])} className="text-amber-600 hover:text-amber-400">
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

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
      <div ref={ref} className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-900">
            <tr>
              {/* Right pane: action column is FIRST (left edge = near separator) */}
              {side === 'right' && (
                <th className="sticky left-0 z-20 w-10 border-b border-slate-800 bg-slate-900" />
              )}
              <th className="w-5/12 border-b border-slate-800 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Key
              </th>
              <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Value
              </th>
              {/* Left pane: action column is LAST (right edge = near separator) */}
              {side === 'left' && (
                <th className="sticky right-0 z-20 w-10 border-b border-slate-800 bg-slate-900" />
              )}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => {
              const variable = side === 'left' ? row.left : row.right
              const isEditing = editingKey === row.key
              const pending = pendingChanges.find((c) => c.key === row.key && c.side === side)
              const displayValue = pending?.newValue ?? variable?.value

              const showCopyButton =
                !!variable &&
                row.status !== 'ghost' &&
                row.status !== 'identical' &&
                !!otherGroup &&
                !variable?.isSecret

              const actionCell = (
                <td
                  className={`w-10 px-1 py-2 bg-slate-950 ${
                    side === 'left' ? 'sticky right-0' : 'sticky left-0'
                  }`}
                >
                  <button
                    onClick={showCopyButton ? () => copyRowToOtherSide(row.key, variable?.value) : undefined}
                    title={showCopyButton ? `Copy to ${side === 'left' ? 'Right' : 'Left'}` : undefined}
                    className={`rounded p-1 transition ${
                      showCopyButton
                        ? 'text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                        : 'invisible'
                    }`}
                  >
                    {side === 'left' ? (
                      <ArrowRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowLeft className="h-3.5 w-3.5" />
                    )}
                  </button>
                </td>
              )

              return (
                <tr
                  key={`${row.key}-${idx}`}
                  className={`border-b border-slate-800/50 ${rowClass(!variable ? 'ghost' : row.status)} group`}
                >
                  {side === 'right' && actionCell}

                  {/* Key cell */}
                  <td className="w-5/12 max-w-0 overflow-hidden px-4 py-2">
                    <span
                      title={row.key}
                      className={`mono selectable block truncate text-sm ${
                        row.status === 'ghost' || !variable ? 'invisible' : 'text-slate-300'
                      }`}
                    >
                      {row.key}
                    </span>
                  </td>

                  {/* Value cell */}
                  <td className="max-w-0 overflow-hidden px-4 py-2">
                    {row.status === 'ghost' || !variable ? (
                      <span className="mono block truncate text-sm invisible">&nbsp;</span>
                    ) : variable?.isSecret ? (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Lock className="h-3 w-3" />
                        <span className="mono text-sm">{SECRET_PLACEHOLDER}</span>
                      </div>
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
                      <span
                        className={`mono selectable block cursor-text truncate rounded text-sm text-slate-300 ${
                          pending || row.status === 'modified' ? 'diff-cell-modified' : ''
                        }`}
                        onDoubleClick={() => startEdit(row.key, displayValue)}
                        title={displayValue ?? ''}
                      >
                        {displayValue ?? <span className="text-slate-600 italic">empty</span>}
                      </span>
                    )}
                  </td>

                  {side === 'left' && actionCell}
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <p className="text-sm">No variables to display</p>
          </div>
        )}
      </div>

      {/* Review modal */}
      {showReview && pane.projectId && pane.groupId && (
        <ReviewChangesModal
          pendingChanges={pendingChanges.filter(
            (c) => c.side === (side === 'left' ? 'right' : 'left')
          )}
          projectId={pane.projectId}
          groupId={pane.groupId}
          currentVariables={otherGroup?.variables ?? {}}
          onClose={() => setShowReview(false)}
          onCommit={async (variables) => {
            await updateMutation.mutateAsync({
              projectId: side === 'left' ? (rightPane.projectId ?? pane.projectId!) : (leftPane.projectId ?? pane.projectId!),
              groupId: side === 'left' ? (rightPane.groupId ?? pane.groupId!) : (leftPane.groupId ?? pane.groupId!),
              variables
            })
            setPendingChanges([])
            setShowReview(false)
          }}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
})
