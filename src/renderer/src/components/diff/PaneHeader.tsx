import { FolderOpen, Layers, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from '../ui/Tooltip'

interface Props {
  side: 'left' | 'right'
  projectName: string | null
  groupName: string | null
  /** When set and pane has a group loaded, an unload button is shown next to the label. */
  onUnload?: () => void
  hasGroup: boolean
}

export function PaneHeader({
  side,
  projectName,
  groupName,
  onUnload,
  hasGroup
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  const label = side === 'left' ? t('pane.left') : t('pane.right')

  const borderBg =
    side === 'left' ? 'border-blue-500/20 bg-blue-500/5' : 'border-fuchsia-500/20 bg-fuchsia-500/5'

  const labelStyle =
    side === 'left' ? 'bg-blue-500/20 text-blue-400' : 'bg-fuchsia-500/20 text-fuchsia-400'

  const breadcrumbs = projectName ? (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      <span className="truncate">{projectName}</span>
      {groupName && (
        <>
          <span className="text-slate-700">/</span>
          <Layers className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="truncate font-medium text-slate-300">{groupName}</span>
        </>
      )}
    </div>
  ) : (
    <span className="text-xs text-slate-600">{t('pane.noGroupSelected')}</span>
  )

  const unloadBtn =
    hasGroup && onUnload ? (
      <Tooltip content={t('pane.unloadTooltip')} side="bottom">
        <button
          type="button"
          onClick={onUnload}
          className="rounded p-0.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
          aria-label={t('pane.unloadTooltip')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    ) : null

  const labelEl = (
    <div className="flex shrink-0 items-center gap-1">
      {side === 'left' && unloadBtn}
      <span
        className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider ${labelStyle}`}
      >
        {label}
      </span>
      {side === 'right' && unloadBtn}
    </div>
  )

  return (
    <div
      className={`flex h-10 shrink-0 items-center justify-between gap-2 border-b px-4 py-2 ${borderBg}`}
    >
      {side === 'left' ? breadcrumbs : labelEl}
      {side === 'left' ? labelEl : breadcrumbs}
    </div>
  )
}
