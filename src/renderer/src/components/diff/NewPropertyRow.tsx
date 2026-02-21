import React, { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { DraftNewVariable } from '../../types'

interface Props {
  side: 'left' | 'right'
  variable: DraftNewVariable
  /** All current added-variable keys (for duplicate detection). */
  existingKeys: string[]
  /** Cloud variable keys (for duplicate detection against real variables). */
  cloudKeys: string[]
  /**
   * Called when key or value changes.
   * oldKey = previous key (unchanged for value edits), newKey = the (possibly new) key.
   */
  onUpdate: (oldKey: string, newKey: string, value: string) => void
  onDelete: (key: string) => void
}

export function NewPropertyRow({
  side,
  variable,
  existingKeys,
  cloudKeys,
  onUpdate,
  onDelete
}: Props): React.JSX.Element {
  const [localKey, setLocalKey] = useState(variable.key)
  const [localValue, setLocalValue] = useState(variable.value)
  const keyRef = useRef<HTMLInputElement>(null)

  // Auto-focus the key input when the row first mounts.
  useEffect(() => {
    keyRef.current?.focus()
    keyRef.current?.select()
  }, [])

  const isDuplicateKey =
    localKey.trim() !== '' &&
    (cloudKeys.includes(localKey.trim()) ||
      existingKeys.filter((k) => k !== variable.key).includes(localKey.trim()))
  const isEmptyKey = localKey.trim() === ''
  const hasKeyError = isEmptyKey || isDuplicateKey

  function commitKey(): void {
    const trimmed = localKey.trim()
    if (trimmed === '' || trimmed === variable.key) return
    if (cloudKeys.includes(trimmed) || existingKeys.filter((k) => k !== variable.key).includes(trimmed)) return
    onUpdate(variable.key, trimmed, localValue)
  }

  function commitValue(val: string): void {
    setLocalValue(val)
    onUpdate(variable.key, variable.key, val)
  }

  return (
    <tr className="border-b border-white/5 bg-emerald-950/20 hover:bg-emerald-950/30 transition-colors">
      {/* Outer-left column: delete button for left pane, empty for right pane */}
      <td className="w-10 px-1 py-1.5 bg-emerald-950/20 sticky left-0">
        <div className="flex items-center justify-center">
          {side === 'left' && (
            <button
              onClick={() => onDelete(variable.key)}
              title="Discard this new variable"
              className="inline-flex items-center justify-center rounded p-1 text-white/30
                hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </td>

      {/* Key cell */}
      <td className="w-5/12 px-3 py-1.5 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            NEW
          </span>
          <input
            ref={keyRef}
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            onBlur={commitKey}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitKey()
              if (e.key === 'Escape') setLocalKey(variable.key)
            }}
            placeholder="variable.key"
            className={[
              'flex-1 min-w-0 bg-transparent rounded px-1.5 py-0.5 outline-none border',
              'text-xs font-mono text-white placeholder:text-white/30',
              'focus:ring-1',
              hasKeyError
                ? 'border-red-500/60 focus:border-red-400 focus:ring-red-500/40 text-red-300'
                : 'border-white/10 focus:border-emerald-400/60 focus:ring-emerald-500/20'
            ].join(' ')}
          />
          {isDuplicateKey && (
            <span className="text-[10px] text-red-400 whitespace-nowrap">duplicate</span>
          )}
          {isEmptyKey && (
            <span className="text-[10px] text-red-400 whitespace-nowrap">required</span>
          )}
        </div>
      </td>

      {/* Value cell */}
      <td className="px-3 py-1.5 text-xs font-mono">
        <input
          value={localValue}
          onChange={(e) => commitValue(e.target.value)}
          placeholder="value"
          className="w-full bg-transparent rounded px-1.5 py-0.5 outline-none border
            border-white/10 focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-500/20
            text-xs font-mono text-white placeholder:text-white/30"
        />
      </td>

      {/* Outer-right column: empty for left pane, delete button for right pane */}
      <td className="w-10 px-1 py-1.5 bg-emerald-950/20 sticky right-0">
        <div className="flex items-center justify-center">
          {side === 'right' && (
            <button
              onClick={() => onDelete(variable.key)}
              title="Discard this new variable"
              className="inline-flex items-center justify-center rounded p-1 text-white/30
                hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
