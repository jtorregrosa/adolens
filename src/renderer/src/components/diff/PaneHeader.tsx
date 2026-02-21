import { Layers, FolderOpen } from 'lucide-react'

interface Props {
  side: 'left' | 'right'
  projectName: string | null
  groupName: string | null
}

export function PaneHeader({ side, projectName, groupName }: Props): React.JSX.Element {
  const label = side === 'left' ? 'Left' : 'Right'

  const borderBg = side === 'left'
    ? 'border-blue-500/20 bg-blue-500/5'
    : 'border-fuchsia-500/20 bg-fuchsia-500/5'

  const labelStyle = side === 'left'
    ? 'bg-blue-500/20 text-blue-400'
    : 'bg-fuchsia-500/20 text-fuchsia-400'

  return (
    <div className={`flex items-center gap-2 border-b px-4 py-2 ${borderBg} ${side === 'left' ? 'flex-row-reverse' : ''}`}>
      <span className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider ${labelStyle}`}>
        {label}
      </span>

      {projectName ? (
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
        <span className="text-xs text-slate-600">No group selected</span>
      )}

    </div>
  )
}
