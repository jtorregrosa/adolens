import { useState } from 'react'
import { CloudUpload, FileJson, FileUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AdoVariable } from '../../types'
import { ExportModal } from '../modals/ExportModal'
import { ImportModal } from '../modals/ImportModal'
import { Tooltip } from '../ui/Tooltip'

interface Props {
  side: 'left' | 'right'
  hasUnsavedChanges: boolean
  onSync: () => Promise<void>
  variables?: Record<string, AdoVariable>
  groupName?: string | null
  onImport: (variables: Record<string, AdoVariable>) => void
}

export function PaneActionBar({ hasUnsavedChanges, onSync, variables, groupName, onImport }: Props): React.JSX.Element {
  const [isSyncing, setIsSyncing] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  async function handleSync(): Promise<void> {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await onSync()
      toast.success('Changes pushed to Azure DevOps')
    } catch (err) {
      toast.error(`Push failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsSyncing(false)
    }
  }

  function handleExport(): void {
    if (!variables || Object.keys(variables).length === 0) {
      toast.warning('No variables to export')
      return
    }
    setExportOpen(true)
  }

  function handleImport(): void {
    setImportOpen(true)
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-center border-t border-slate-800 bg-slate-950 px-4 py-2">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/80 px-2 py-1.5 shadow-sm backdrop-blur-md">

          {/* ── Push Changes ──────────────────────────────────── */}
          <ActionButton
            label="Push"
            onClick={handleSync}
            disabled={isSyncing}
            indicator={hasUnsavedChanges && !isSyncing}
            indicatorTitle="Unsaved local changes"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            ) : (
              <CloudUpload
                className={`h-4 w-4 transition-colors ${
                  hasUnsavedChanges ? 'text-orange-400' : 'text-slate-400'
                }`}
              />
            )}
          </ActionButton>

          <Divider />

          {/* ── Export ────────────────────────────────────────── */}
          <ActionButton label="Export" onClick={handleExport}>
            <FileJson className="h-4 w-4 text-slate-400" />
          </ActionButton>

          {/* ── Import ────────────────────────────────────────── */}
          <ActionButton label="Import" onClick={handleImport}>
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
  indicator?: boolean
  indicatorTitle?: string
  children: React.ReactNode
}

function ActionButton({
  label,
  onClick,
  disabled,
  indicator,
  indicatorTitle,
  children
}: ActionButtonProps): React.JSX.Element {
  return (
    <Tooltip content={indicator && indicatorTitle ? <>{label} <span className="text-orange-400">· {indicatorTitle}</span></> : label} side="top">
      <button
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
        <span className="hidden sm:inline">{label}</span>

        {/* Unsaved-changes dot */}
        {indicator && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-400 ring-1 ring-slate-900" />
        )}
      </button>
    </Tooltip>
  )
}

function Divider(): React.JSX.Element {
  return <span className="mx-1 h-4 w-px shrink-0 rounded-full bg-white/10" />
}
