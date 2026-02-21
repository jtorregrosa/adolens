import { useMemo } from 'react'
import type { AdoVariable, DiffModel, DiffVariableRow } from '../types'

/**
 * Core diff engine.
 *
 * Given two variable maps (left/source, right/target), produces a unified
 * DiffModel with aligned rows, statuses, and statistics.
 */
export function useVariableDiff(
  left: Record<string, AdoVariable> | undefined,
  right: Record<string, AdoVariable> | undefined
): DiffModel {
  return useMemo(() => {
    const leftVars = left ?? {}
    const rightVars = right ?? {}

    const allKeys = Array.from(new Set([...Object.keys(leftVars), ...Object.keys(rightVars)])).sort(
      (a, b) => a.localeCompare(b)
    )

    const stats = { identical: 0, modified: 0, added: 0, removed: 0 }
    const rows: DiffVariableRow[] = []

    for (const key of allKeys) {
      const l = leftVars[key] ?? null
      const r = rightVars[key] ?? null

      let status: DiffVariableRow['status']

      if (l && r) {
        // Both sides have the key
        if (l.isSecret || r.isSecret) {
          // Secrets: treat as identical (we can never compare hidden values)
          status = 'identical'
          stats.identical++
        } else if ((l.value ?? '') === (r.value ?? '')) {
          status = 'identical'
          stats.identical++
        } else {
          status = 'modified'
          stats.modified++
        }
      } else if (l && !r) {
        // Exists on left, missing on right → removed from right's perspective
        status = 'removed'
        stats.removed++
        rows.push({ key, status, left: l, right: null })
        continue
      } else {
        // Exists on right, missing on left → added on right's perspective
        status = 'added'
        stats.added++
        rows.push({ key, status, left: null, right: r })
        continue
      }

      rows.push({ key, status, left: l, right: r })
    }

    return { rows, stats }
  }, [left, right])
}
