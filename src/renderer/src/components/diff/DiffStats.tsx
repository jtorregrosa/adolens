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
  // Left owns: identical + modified + removed vars
  // Right owns: identical + modified + added vars
  const total =
    side === 'left'
      ? stats.identical + stats.modified + stats.removed
      : stats.identical + stats.modified + stats.added

  const isLeft = side === 'left'

  return (
    <div className={`flex items-center gap-1.5 ${isLeft ? 'flex-row-reverse' : ''}`}>
      <span
        className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
          isLeft ? 'bg-blue-500/20 text-blue-400' : 'bg-fuchsia-500/20 text-fuchsia-400'
        }`}
      >
        {isLeft ? 'Left' : 'Right'}
      </span>
      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-400">
        {total} vars
      </span>
      <Chip
        count={isLeft ? stats.removed : stats.added}
        label="only here"
        color={isLeft ? 'bg-red-500/20 text-red-400' : 'bg-fuchsia-500/20 text-fuchsia-400'}
      />
      <Chip count={stats.modified} label="modified" color="bg-amber-500/20 text-amber-400" />
      <Chip count={stats.identical} label="identical" color="bg-slate-700 text-slate-400" />
    </div>
  )
}
