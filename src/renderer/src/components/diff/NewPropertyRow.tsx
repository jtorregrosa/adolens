import { Check, Trash2, X } from 'lucide-react'
import { forwardRef, useCallback, useState } from 'react'
import type { DraftNewVariable } from '../../types'

interface Props {
  side: 'left' | 'right'
  variable: DraftNewVariable
  existingKeys: string[]
  cloudKeys: string[]
  onUpdate: (oldKey: string, newKey: string, value: string) => void
  onDelete: (key: string) => void
}

export const NewPropertyRow = forwardRef<HTMLTableRowElement, Props>(function NewPropertyRow(
  { side, variable, existingKeys, cloudKeys, onUpdate, onDelete },
  ref
) {
  const [editingKey, setEditingKey] = useState(false)
  const [editingValue, setEditingValue] = useState(false)
  const [editKeyValue, setEditKeyValue] = useState(variable.key)
  const [editValue, setEditValue] = useState(variable.value)

  const takenKeys = new Set([...cloudKeys, ...existingKeys.filter((k) => k !== variable.key)])
  const keyInputInvalid =
    editKeyValue.trim() === '' ||
    (takenKeys.has(editKeyValue.trim()) && editKeyValue.trim() !== variable.key)

  const commitKey = useCallback(() => {
    const trimmed = editKeyValue.trim()
    if (keyInputInvalid || trimmed === variable.key) {
      setEditingKey(false)
      setEditKeyValue(variable.key)
      return
    }
    onUpdate(variable.key, trimmed, variable.value)
    setEditingKey(false)
  }, [editKeyValue, variable.key, variable.value, keyInputInvalid, onUpdate])

  const cancelKey = useCallback(() => {
    setEditKeyValue(variable.key)
    setEditingKey(false)
  }, [variable.key])

  const commitValue = useCallback(() => {
    onUpdate(variable.key, variable.key, editValue)
    setEditingValue(false)
  }, [variable.key, editValue, onUpdate])

  const cancelValue = useCallback(() => {
    setEditValue(variable.value)
    setEditingValue(false)
  }, [variable.value])

  return (
    <tr ref={ref} className="diff-row-added border-b border-slate-800/50 group">
      <td className="w-10 px-1 py-2 sticky left-0 align-middle">
        <div className="flex min-h-6 items-center justify-center">
          {side === 'left' && (
            <button
              onClick={() => onDelete(variable.key)}
              title="Discard this new variable"
              className="rounded p-1 text-transparent transition group-hover:text-slate-600 hover:!text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </td>

      {/* Key cell — same editor as DiffTable */}
      <td className="w-5/12 max-w-0 overflow-hidden px-4 py-2 align-middle">
        <div className="flex min-h-6 items-center gap-1">
          {editingKey ? (
            <>
              <input
                autoFocus
                className={`selectable mono flex-1 rounded border px-2 py-0.5 text-sm text-white outline-none bg-slate-800 ${
                  keyInputInvalid ? 'border-red-500' : 'border-blue-500'
                }`}
                value={editKeyValue}
                onChange={(e) => setEditKeyValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitKey()
                  if (e.key === 'Escape') cancelKey()
                }}
              />
              <button
                onClick={commitKey}
                disabled={keyInputInvalid}
                className="rounded p-0.5 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-30"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={cancelKey}
                className="rounded p-0.5 text-red-400 hover:bg-red-400/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span
              className="mono selectable block min-h-6 w-full min-w-0 cursor-text truncate rounded text-sm font-bold text-slate-300 py-0.5"
              onClick={() => {
                setEditKeyValue(variable.key)
                setEditingKey(true)
              }}
            >
              {variable.key}
            </span>
          )}
        </div>
      </td>

      {/* Value cell — same editor as DiffTable */}
      <td className="max-w-0 overflow-hidden px-4 py-2 align-middle">
        <div className="flex min-h-6 items-center gap-1">
          {editingValue ? (
            <>
              <input
                autoFocus
                className="selectable mono flex-1 rounded border border-blue-500 bg-slate-800 px-2 py-0.5 text-sm text-white outline-none"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitValue()
                  if (e.key === 'Escape') cancelValue()
                }}
              />
              <button
                onClick={commitValue}
                className="rounded p-0.5 text-emerald-400 hover:bg-emerald-400/10"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={cancelValue}
                className="rounded p-0.5 text-red-400 hover:bg-red-400/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span
              className="mono selectable block min-h-6 w-full min-w-0 cursor-text truncate rounded text-sm font-bold text-slate-300 py-0.5"
              onClick={() => {
                setEditValue(variable.value)
                setEditingValue(true)
              }}
            >
              {variable.value || <span className="text-slate-600 italic">empty</span>}
            </span>
          )}
        </div>
      </td>

      <td className="w-10 px-1 py-2 sticky right-0 align-middle">
        <div className="flex min-h-6 items-center justify-center">
          {side === 'right' && (
            <button
              onClick={() => onDelete(variable.key)}
              title="Discard this new variable"
              className="rounded p-1 text-transparent transition group-hover:text-slate-600 hover:!text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
})
