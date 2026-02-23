import { CloudUpload, FileJson, FileUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { AdoVariable } from '../../types'
import { ExportModal } from '../modals/ExportModal'
import { ImportModal } from '../modals/ImportModal'
import { Tooltip } from '../ui/Tooltip'

interface Props {
  side: 'left' | 'right'
  /** Number of staged local changes. Drives the badge and icon colour. */
  pendingCount: number
  /** Opens the PushReviewModal – no async work happens here. */
  onPush: () => void
  variables?: Record<string, AdoVariable>
  groupName?: string | null
  onImport: (variables: Record<string, AdoVariable>) => void
}

export function PaneActionBar({
  pendingCount,
  onPush,
  variables,
  groupName,
  onImport
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const hasChanges = pendingCount > 0

  function handleExport(): void {
    if (!variables || Object.keys(variables).length === 0) {
      toast.warning(t('actionBar.toast.noVariablesToExport'))
      return
    }
    setExportOpen(true)
  }

  function handleImport(): void {
    setImportOpen(true)
  }

  return (
    <>
      <div className="pane-action-bar-wrap flex shrink-0 items-center justify-center border-t border-slate-800 bg-slate-950 px-4 py-2">
        <div className="pane-action-bar-inner flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/80 px-2 py-1.5 shadow-sm backdrop-blur-md">
          {/* ── Push Changes ──────────────────────────────────── */}
          <ActionButton
            label={t('actionBar.reviewAndPush')}
            onClick={onPush}
            disabled={!hasChanges}
            badgeCount={pendingCount}
            indicatorTitle={
              hasChanges
                ? t('actionBar.stagedChanges', {
                    count: pendingCount,
                    plural: pendingCount !== 1 ? 's' : ''
                  })
                : undefined
            }
          >
            <CloudUpload
              className={`h-4 w-4 transition-colors ${
                hasChanges ? 'text-orange-400' : 'text-slate-400'
              }`}
            />
          </ActionButton>

          <Divider />

          {/* ── Export ────────────────────────────────────────── */}
          <ActionButton label={t('actionBar.export')} onClick={handleExport}>
            <FileJson className="h-4 w-4 text-slate-400" />
          </ActionButton>

          {/* ── Import ────────────────────────────────────────── */}
          <ActionButton label={t('actionBar.import')} onClick={handleImport}>
            <FileUp className="h-4 w-4 text-slate-400" />
          </ActionButton>
        </div>
      </div>

      {exportOpen && variables && (
        <ExportModal
          variables={variables}
          groupName={groupName}
          onClose={() => setExportOpen(false)}
        />
      )}

      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={(vars) => {
            onImport(vars)
            setImportOpen(false)
          }}
        />
      )}
    </>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface ActionButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  /** When set, renders a numeric badge instead of a plain dot. */
  badgeCount?: number
  indicatorTitle?: string
  children: React.ReactNode
}

function ActionButton({
  label,
  onClick,
  disabled,
  badgeCount,
  indicatorTitle,
  children
}: ActionButtonProps): React.JSX.Element {
  const hasBadge = badgeCount !== undefined && badgeCount > 0

  return (
    <Tooltip
      content={
        hasBadge && indicatorTitle ? (
          <>
            {label} <span className="text-orange-400">· {indicatorTitle}</span>
          </>
        ) : (
          label
        )
      }
      side="top"
    >
      <button
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className="pane-action-btn relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
        <span className="hidden sm:inline">{label}</span>

        {/* Numeric pending-changes badge */}
        {hasBadge && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white ring-1 ring-slate-900">
            {badgeCount! > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>
    </Tooltip>
  )
}

function Divider(): React.JSX.Element {
  return (
    <span className="pane-action-bar-divider mx-1 h-4 w-px shrink-0 rounded-full bg-white/10" />
  )
}
