import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CloudUpload, Trash2, Loader2, Lock, PackageOpen, AlertTriangle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { DraftChange } from '../../hooks/useVariableBuffer'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  /** Library name shown in the confirm dialog and modal title. */
  groupName: string | null | undefined
  /** Project name used in the confirm dialog message. */
  projectName: string | null | undefined
  /** Derived pending changes from useVariableBuffer. */
  draftChanges: DraftChange[]
  /** Fully merged variable map ready to be sent to the API. */
  mergedVariables: Record<string, { value: string; isSecret: boolean }>
  onClose: () => void
  /** Called when the user confirms; receives the merged payload. */
  onConfirmPush: (variables: Record<string, { value: string; isSecret: boolean }>) => Promise<void>
  /** Called when the user clicks "Discard All" – clears local edits in the parent. */
  onDiscardAll: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PushReviewModal({
  groupName,
  projectName: _projectName,
  draftChanges,
  mergedVariables,
  onClose,
  onConfirmPush,
  onDiscardAll
}: Props): React.JSX.Element {
  const [isPushing, setIsPushing] = useState(false)

  const isEmpty = draftChanges.length === 0

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function handleConfirmPush(): Promise<void> {
    if (isPushing) return

    setIsPushing(true)
    try {
      await onConfirmPush(mergedVariables)
      onClose()
    } catch (err) {
      toast.error(`Push failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsPushing(false)
    }
  }

  function handleDiscardAll(): void {
    onDiscardAll()
    onClose()
    toast.info('Local changes discarded')
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isPushing) onClose()
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mx-4 w-full max-w-2xl rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-slate-700/50"
        >
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">Review Local Changes</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isEmpty
                  ? 'No local changes detected'
                  : `${draftChanges.length} change${draftChanges.length !== 1 ? 's' : ''} pending for `}
                {!isEmpty && (
                  <span className="font-medium text-slate-300">{groupName ?? 'this library'}</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Discard All */}
              {!isEmpty && (
                <button
                  onClick={handleDiscardAll}
                  disabled={isPushing}
                  className="flex items-center gap-1.5 rounded-lg border border-red-800/50 bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-900/40 hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Discard All
                </button>
              )}

              {/* Close */}
              <button
                onClick={onClose}
                disabled={isPushing}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Warning bar ───────────────────────────────────────────────── */}
          {!isEmpty && (
            <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 px-4 py-3 text-xs text-amber-400 ring-1 ring-amber-500/20">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Pushing will overwrite the variable group via{' '}
                <strong className="font-semibold">PUT /distributedtask/variablegroups</strong>.
                This action cannot be undone.
              </span>
            </div>
          )}

          {/* ── Body ──────────────────────────────────────────────────────── */}
          {isEmpty ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <PackageOpen className="h-10 w-10 text-slate-700" />
              <p className="text-sm font-medium text-slate-400">No local changes detected</p>
              <p className="max-w-xs text-xs text-slate-600">
                Edit variable values or keys, sync keys from the other pane, or add / delete variables to stage changes here.
              </p>
            </div>
          ) : (
            /* Diff tables */
            <div className="mx-6 my-4 flex flex-col gap-4 max-h-96 overflow-auto">
              {/* ── Modified / synced variables ─────────────────────────── */}
              {(() => {
                const modified = draftChanges.filter((c) => !c.isCreated && !c.isDeleted && !c.isRenamed)
                if (modified.length === 0) return null
                return (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Modified Variables
                      <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-amber-400">
                        {modified.length}
                      </span>
                    </p>
                    <div className="rounded-lg ring-1 ring-slate-700/50">
                      <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 bg-slate-800">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Variable Key</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Old Value</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">New Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modified.map((change) => (
                            <tr key={change.key} className="border-t border-slate-800/80 hover:bg-slate-800/30">
                              <td className="mono px-4 py-2.5 text-slate-200">{change.key}</td>
                              <td className="mono px-4 py-2.5">
                                {change.isSecret ? (
                                  <span className="flex items-center gap-1 text-slate-600">
                                    <Lock className="h-3 w-3" /><em>secret</em>
                                  </span>
                                ) : change.oldValue === undefined ? (
                                  <em className="text-slate-600">—</em>
                                ) : (
                                  <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-400 line-through">
                                    {change.oldValue || <em className="not-italic text-slate-600 no-underline">(empty)</em>}
                                  </span>
                                )}
                              </td>
                              <td className="mono px-4 py-2.5">
                                {change.isSecret ? (
                                  <span className="flex items-center gap-1 text-slate-600">
                                    <Lock className="h-3 w-3" /><em>secret (overwritten)</em>
                                  </span>
                                ) : (
                                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-400">
                                    {change.newValue || <em className="not-italic text-slate-600">(empty)</em>}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
              {/* ── Renamed variables ─────────────────────────────────────── */}
              {(() => {
                const renamed = draftChanges.filter((c) => c.isRenamed)
                if (renamed.length === 0) return null
                return (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Renamed Variables
                      <span className="ml-2 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-blue-400">
                        {renamed.length}
                      </span>
                    </p>
                    <div className="rounded-lg ring-1 ring-slate-700/50">
                      <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 bg-slate-800">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Old Key</th>
                            <th className="w-6" />
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">New Key</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {renamed.map((change) => {
                            const valueChanged = change.newValue !== change.oldValue
                            return (
                              <tr key={change.key} className="border-t border-slate-800/80 hover:bg-slate-800/30">
                                <td className="mono px-4 py-2.5 text-slate-500 line-through">{change.key}</td>
                                <td className="py-2.5 text-slate-600">
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </td>
                                <td className="mono px-4 py-2.5">
                                  <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-semibold text-blue-300">
                                    {change.newKey}
                                  </span>
                                </td>
                                <td className="mono px-4 py-2.5">
                                  {change.isSecret ? (
                                    <span className="flex items-center gap-1 text-slate-600">
                                      <Lock className="h-3 w-3" /><em>secret</em>
                                    </span>
                                  ) : valueChanged ? (
                                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-400">
                                      {change.newValue || <em className="not-italic text-slate-600">(empty)</em>}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">
                                      {change.newValue || <em className="not-italic text-slate-600">(empty)</em>}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
              {/* ── Newly added variables ────────────────────────────────── */}
              {(() => {
                const created = draftChanges.filter((c) => c.isCreated)
                if (created.length === 0) return null
                return (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Added Variables
                      <span className="ml-2 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-emerald-400">
                        {created.length}
                      </span>
                    </p>
                    <div className="rounded-lg ring-1 ring-emerald-700/30">
                      <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 bg-slate-800">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Variable Key</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {created.map((change) => (
                            <tr key={change.key} className="border-t border-slate-800/80 bg-emerald-950/10 hover:bg-emerald-950/20">
                              <td className="mono px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="rounded px-1 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    NEW
                                  </span>
                                  <span className="text-slate-200">{change.key}</span>
                                </div>
                              </td>
                              <td className="mono px-4 py-2.5">
                                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-400">
                                  {change.newValue || <em className="not-italic text-slate-600">(empty)</em>}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* ── Deleted variables ────────────────────────────────────── */}
              {(() => {
                const deleted = draftChanges.filter((c) => c.isDeleted)
                if (deleted.length === 0) return null
                return (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Deleted Variables
                      <span className="ml-2 rounded-full bg-red-500/20 px-1.5 py-0.5 text-red-400">
                        {deleted.length}
                      </span>
                    </p>
                    <div className="rounded-lg ring-1 ring-red-700/30">
                      <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 bg-slate-800">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Variable Key</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Current Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deleted.map((change) => (
                            <tr key={change.key} className="border-t border-slate-800/80 bg-red-950/10 hover:bg-red-950/20">
                              <td className="mono px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="rounded px-1 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                    DEL
                                  </span>
                                  <span className="text-slate-400 line-through">{change.key}</span>
                                </div>
                              </td>
                              <td className="mono px-4 py-2.5">
                                {change.isSecret ? (
                                  <span className="flex items-center gap-1 text-slate-600">
                                    <Lock className="h-3 w-3" /><em>secret</em>
                                  </span>
                                ) : (
                                  <span className="text-slate-500 line-through">
                                    {change.oldValue || <em className="not-italic text-slate-600">(empty)</em>}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
            <button
              onClick={onClose}
              disabled={isPushing}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-300 disabled:opacity-50"
            >
              {isEmpty ? 'Close' : 'Cancel'}
            </button>

            {!isEmpty && (
              <button
                onClick={handleConfirmPush}
                disabled={isPushing}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPushing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )}
                {isPushing ? 'Pushing…' : 'Confirm & Push to ADO'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
