import { AnimatePresence, motion } from 'framer-motion'
import { Layers, User, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AdoVariableGroup } from '../../types'

/** Format as DD-MM-YYYY HH:MM:SS. Accepts ISO string, timestamp (ms/s), or space-separated datetime. */
function formatDate(value: string | number | undefined | null): string {
  if (!value) return ''

  // 1. Handle the specific string format directly via Regex
  if (typeof value === 'string') {
    // Matches YYYY-MM-DD followed by a space or 'T', then HH:MM:SS
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2}):(\d{2})/)

    if (match) {
      // Extract the captured groups
      const [_, year, month, day, hours, minutes, seconds] = match

      // Pad the hours (e.g., turns "8" into "08")
      const paddedHours = hours.padStart(2, '0')

      return `${day}-${month}-${year} ${paddedHours}:${minutes}:${seconds}`
    }
  }

  // 2. Fallback for standard ISO strings or numeric timestamps
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Invalid Date'
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0') // Months are 0-indexed
  const year = date.getFullYear() // AAAA

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
}

function UserAvatar({
  imageUrl,
  displayName
}: {
  imageUrl?: string | null
  displayName?: string | null
}): React.JSX.Element {
  const initials =
    displayName != null && displayName.trim() !== ''
      ? displayName
          .trim()
          .split(/\s+/)
          .map((s) => s[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : null

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={displayName ?? ''}
        className="h-9 w-9 shrink-0 rounded-full border border-slate-600 bg-slate-700 object-cover"
      />
    )
  }
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-700 text-slate-400"
      title={displayName ?? undefined}
    >
      {initials ? (
        <span className="text-xs font-medium">{initials}</span>
      ) : (
        <User className="h-4 w-4" />
      )}
    </div>
  )
}

interface LibraryDetailsModalProps {
  group: AdoVariableGroup
  projectName: string
  onClose: () => void
}

/**
 * Modal showing full library (variable group) details in a structured layout.
 */
export function LibraryDetailsModal({
  group,
  projectName,
  onClose
}: LibraryDetailsModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const count = group.variableCount ?? Object.keys(group.variables ?? {}).length

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
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="app-modal-panel w-full max-w-lg rounded-xl border border-slate-700/60 bg-slate-900/98 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                <Layers className="h-5 w-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-100">{group.name}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {projectName} · ID {group.id}
                  {group.type != null && group.type !== '' && ` · ${group.type}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-700/80 hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body: sections */}
          <div className="max-h-[min(70vh,480px)] overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {/* Description */}
              <section className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-4">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t('modals.libraryDetails.description')}
                </h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  {group.description != null && group.description !== '' ? group.description : '—'}
                </p>
              </section>

              {/* Variables count only */}
              <section className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-4">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t('modals.libraryDetails.variables')}
                </h3>
                <p className="text-sm text-slate-300">
                  {t('modals.libraryDetails.variableCount', { count })}
                </p>
              </section>

              {/* Audit: Created / Modified */}
              {(group.createdOn != null || group.modifiedOn != null) && (
                <section className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t('modals.libraryDetails.audit')}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {group.createdOn != null && (
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase text-slate-500">
                          {t('modals.libraryDetails.created')}
                        </div>
                        <div className="mt-1.5 flex items-start gap-2">
                          <UserAvatar
                            imageUrl={group.createdByImageUrl}
                            displayName={group.createdBy}
                          />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            {group.createdBy != null && group.createdBy.trim() !== '' && (
                              <span className="text-xs text-slate-400">{group.createdBy}</span>
                            )}
                            <span className="text-sm text-slate-300">
                              {formatDate(group.createdOn)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {group.modifiedOn != null && (
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase text-slate-500">
                          {t('modals.libraryDetails.modified')}
                        </div>
                        <div className="mt-1.5 flex items-start gap-2">
                          <UserAvatar
                            imageUrl={group.modifiedByImageUrl}
                            displayName={group.modifiedBy}
                          />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            {group.modifiedBy != null && group.modifiedBy.trim() !== '' && (
                              <span className="text-xs text-slate-400">{group.modifiedBy}</span>
                            )}
                            <span className="text-sm text-slate-300">
                              {formatDate(group.modifiedOn)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Shared */}
              {group.isShared != null && (
                <section className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t('modals.libraryDetails.shared')}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {group.isShared
                      ? t('modals.libraryDetails.sharedYes')
                      : t('modals.libraryDetails.sharedNo')}
                  </p>
                </section>
              )}

              {/* Linked projects */}
              {group.variableGroupProjectReferences != null &&
                group.variableGroupProjectReferences.length > 0 && (
                  <section className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-4">
                    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {t('modals.libraryDetails.linkedProjects')}
                    </h3>
                    <ul className="space-y-2">
                      {group.variableGroupProjectReferences.map((ref, i) => (
                        <li
                          key={`${ref.projectId ?? ''}-${ref.projectName ?? ''}-${ref.name ?? ''}-${i}`}
                          className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm"
                        >
                          <span className="font-medium text-slate-200">
                            {ref.projectName ?? ref.name ?? ref.projectId ?? '—'}
                          </span>
                          {ref.description != null && ref.description !== '' && (
                            <span className="text-xs text-slate-500">{ref.description}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-slate-800 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-600"
            >
              {t('modals.libraryDetails.close')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
