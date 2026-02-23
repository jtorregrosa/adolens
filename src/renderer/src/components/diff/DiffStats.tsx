import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DiffModel } from '../../types'
import { Tooltip } from '../ui/Tooltip'

interface Props {
  stats: DiffModel['stats']
  side: 'left' | 'right'
  hasGroup?: boolean
  onUnload?: () => void
}

const Chip = ({
  count,
  label,
  color
}: {
  count: number
  label: string
  color: string
}): React.JSX.Element | null => {
  if (count === 0) return null
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {count} {label}
    </span>
  )
}

export function DiffStats({ stats, side, hasGroup, onUnload }: Props): React.JSX.Element {
  const { t } = useTranslation()

  const total =
    side === 'left'
      ? stats.identical + stats.modified + stats.removed
      : stats.identical + stats.modified + stats.added

  const isLeft = side === 'left'
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
      {isLeft && unloadBtn}
      <span
        className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
          isLeft
            ? 'pane-label-left bg-blue-500/20 text-blue-400'
            : 'pane-label-right bg-fuchsia-500/20 text-fuchsia-400'
        }`}
      >
        {isLeft ? t('pane.left') : t('pane.right')}
      </span>
      {!isLeft && unloadBtn}
    </div>
  )
  const statItems = [
    <span
      key="vars"
      className="rounded-full border border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-400"
    >
      {total} {t('pane.vars')}
    </span>,
    <Chip
      key="onlyHere"
      count={isLeft ? stats.removed : stats.added}
      label={t('pane.onlyHere')}
      color={
        isLeft
          ? 'pane-chip-left bg-blue-500/20 text-blue-400'
          : 'pane-chip-right bg-fuchsia-500/20 text-fuchsia-400'
      }
    />,
    <Chip
      key="modified"
      count={stats.modified}
      label={t('pane.modified')}
      color="bg-amber-500/20 text-amber-400"
    />,
    <Chip
      key="identical"
      count={stats.identical}
      label={t('pane.identical')}
      color="bg-slate-700 text-slate-400"
    />
  ]
  const statsEl = (
    <div className="flex min-w-0 items-center gap-1.5">
      {isLeft ? statItems : [...statItems].reverse()}
    </div>
  )

  return (
    <div className="flex w-full items-center justify-between gap-2">
      {isLeft ? statsEl : labelEl}
      {isLeft ? labelEl : statsEl}
    </div>
  )
}
