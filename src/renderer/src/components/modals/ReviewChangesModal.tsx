import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2, AlertTriangle, Lock } from 'lucide-react'
import type { PendingChange, AdoVariable } from '../../types'

interface Props {
  pendingChanges: PendingChange[]
  projectId: string
  groupId: number
  currentVariables: Record<string, AdoVariable>
  onClose: () => void
  onCommit: (variables: Record<string, { value: string; isSecret: boolean }>) => Promise<void>
  isPending: boolean
}

export function ReviewChangesModal({
  pendingChanges,
  currentVariables,
  onClose,
  onCommit,
  isPending
}: Props): React.JSX.Element {
  // Build the merged variable map (current + pending changes)
  const mergedVariables = useMemo(() => {
    const result: Record<string, { value: string; isSecret: boolean }> = {}

    // Start from current
    for (const [key, v] of Object.entries(currentVariables)) {
      result[key] = { value: v.value ?? '', isSecret: v.isSecret ?? false }
    }

    // Apply pending changes
    for (const change of pendingChanges) {
      const existing = result[change.key]
      result[change.key] = { value: change.newValue, isSecret: existing?.isSecret ?? false }
    }

    return result
  }, [currentVariables, pendingChanges])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mx-4 w-full max-w-2xl rounded-2xl bg-slate-900 ring-1 ring-slate-700/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">Review Changes</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {pendingChanges.length} change(s) will be committed to Azure DevOps
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Warning */}
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-400 ring-1 ring-amber-500/20">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This will overwrite the variable group via{' '}
              <strong>PUT /distributedtask/variablegroups</strong>. This action cannot be undone.
            </span>
          </div>

          {/* Changes table */}
          <div className="mx-6 my-4 max-h-72 overflow-auto rounded-lg ring-1 ring-slate-700/50">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Key
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Before
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    After
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingChanges.map((change) => {
                  const prev = currentVariables[change.key]
                  const isSecret = prev?.isSecret ?? false
                  return (
                    <tr key={change.key} className="border-t border-slate-800">
                      <td className="mono px-4 py-2 text-slate-300">{change.key}</td>
                      <td className="mono px-4 py-2">
                        {isSecret ? (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Lock className="h-3 w-3" /> secret
                          </span>
                        ) : (
                          <span className="rounded bg-red-500/10 px-1 text-red-400">
                            {prev?.value ?? <em className="text-slate-600">empty</em>}
                          </span>
                        )}
                      </td>
                      <td className="mono px-4 py-2">
                        {isSecret ? (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Lock className="h-3 w-3" /> secret (overwritten)
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-500/10 px-1 text-emerald-400">
                            {change.newValue || <em className="text-slate-600">empty</em>}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
            <button
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onCommit(mergedVariables)}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isPending ? 'Committing…' : 'Commit Changes'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
