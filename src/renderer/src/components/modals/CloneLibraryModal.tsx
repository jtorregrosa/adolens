import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, X } from 'lucide-react'
import { useCloneVariableGroup } from '../../hooks/useADOApi'

interface CloneLibraryModalProps {
  projectId: string
  groupId: number
  sourceName: string
  onClose: () => void
}

/**
 * Confirmation modal that lets the user specify a name for the cloned library.
 */
export function CloneLibraryModal({
  projectId,
  groupId,
  sourceName,
  onClose
}: CloneLibraryModalProps): React.JSX.Element {
  const [name, setName] = useState(`${sourceName} - Copy`)
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate: cloneGroup, isPending } = useCloneVariableGroup()

  // Auto-focus + select the text in the name field when the modal opens
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    cloneGroup({ projectId, groupId, newName: trimmed }, { onSuccess: onClose })
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
          className="w-[420px] rounded-xl border border-slate-700/60 bg-slate-900/95 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Copy className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-100">Clone Library</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              A new library containing the same variables will be created under the name below.
              Secret values will be preserved.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                New library name
              </label>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="selectable w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
                placeholder="Enter a name…"
                disabled={isPending}
              />
            </div>

            {/* Footer actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-md border border-slate-700 bg-transparent px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {isPending ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Cloning…
                  </span>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Clone Library
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
