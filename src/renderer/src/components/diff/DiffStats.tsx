import { useTranslation } from 'react-i18next'
import type { DiffModel } from '../../types'

interface Props {
  stats: DiffModel['stats']
  side: 'left' | 'right'
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

export function DiffStats({ stats, side }: Props): React.JSX.Element {
  const { t } = useTranslation()

  const total =
    side === 'left'
      ? stats.identical + stats.modified + stats.removed
      : stats.identical + stats.modified + stats.added

  const isLeft = side === 'left'
  const labelEl = (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
        isLeft ? 'bg-blue-500/20 text-blue-400' : 'bg-fuchsia-500/20 text-fuchsia-400'
      }`}
    >
      {isLeft ? t('pane.left') : t('pane.right')}
    </span>
  )
  const statsEl = (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-400">
        {total} {t('pane.vars')}
      </span>
      <Chip
        count={isLeft ? stats.removed : stats.added}
        label={t('pane.onlyHere')}
        color={isLeft ? 'bg-blue-500/20 text-blue-400' : 'bg-fuchsia-500/20 text-fuchsia-400'}
      />
      <Chip
        count={stats.modified}
        label={t('pane.modified')}
        color="bg-amber-500/20 text-amber-400"
      />
      <Chip
        count={stats.identical}
        label={t('pane.identical')}
        color="bg-slate-700 text-slate-400"
      />
    </div>
  )

  return (
    <div className="flex w-full items-center justify-between gap-2">
      {isLeft ? statsEl : labelEl}
      {isLeft ? labelEl : statsEl}
    </div>
  )
}
