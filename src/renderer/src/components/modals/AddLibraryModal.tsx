import { AnimatePresence, motion } from 'framer-motion'
import { FolderPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAddVariableGroup } from '../../hooks/useADOApi'

interface AddLibraryModalProps {
  projectId: string
  projectName: string
  onClose: () => void
}

/**
 * Modal to create a new empty variable group (library) in a project.
 */
export function AddLibraryModal({
  projectId,
  projectName,
  onClose
}: AddLibraryModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { mutate: addGroup, isPending } = useAddVariableGroup()

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      nameInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    addGroup(
      {
        projectId,
        name: trimmedName,
        description: description.trim() || null
      },
      { onSuccess: onClose }
    )
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
        className="modal-backdrop"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
          className="app-modal-panel w-[420px] rounded-xl border border-slate-700/60 bg-slate-900/95 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <FolderPlus className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                {t('modals.addLibrary.title')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <p className="text-xs leading-relaxed text-slate-400">
              {t('modals.addLibrary.description', { project: projectName })}
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                {t('modals.addLibrary.nameLabel')}
              </label>
              <input
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="selectable w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
                placeholder={t('modals.addLibrary.namePlaceholder')}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                {t('modals.addLibrary.descriptionLabel')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="selectable w-full resize-y rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
                placeholder={t('modals.addLibrary.descriptionPlaceholder')}
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-md border border-slate-700 bg-transparent px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200 disabled:opacity-50"
              >
                {t('modals.addLibrary.cancel')}
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
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {t('modals.addLibrary.creating')}
                  </span>
                ) : (
                  <>
                    <FolderPlus className="h-3 w-3" />
                    {t('modals.addLibrary.create')}
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
