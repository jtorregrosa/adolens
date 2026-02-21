import type { AdoVariable, DraftNewVariable, PendingChange } from '../types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DraftChange {
  /** Variable key (original / old key for renames) */
  key: string
  /** If the key was renamed, this holds the new key name */
  newKey?: string
  /** Value in the cloud (undefined = key did not exist / brand-new variable) */
  oldValue: string | undefined
  /** Value after the local edit */
  newValue: string
  /** True when the variable is marked as a secret (values are hidden) */
  isSecret: boolean
  /** True when this variable was added locally and does not yet exist in ADO */
  isCreated?: boolean
  /** True when this existing variable is locally staged for deletion */
  isDeleted?: boolean
  /** True when the variable key was renamed (key → newKey) */
  isRenamed?: boolean
}

export interface VariableBuffer {
  /**
   * Cloud variables deep-merged with all local edits.
   * This is the payload that will be sent to the ADO API on push.
   */
  mergedVariables: Record<string, { value: string; isSecret: boolean }>
  /**
   * Only the rows that actually differ from the cloud snapshot.
   * Used to populate the PushReviewModal diff table.
   */
  draftChanges: DraftChange[]
  /** Convenience count for the notification badge. */
  pendingCount: number
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Merges the cloud state of a Variable Group with the user's local edits and
 * derives a list of changes that have not yet been pushed to Azure DevOps.
 *
 * @param cloudVariables  The variables object from the last successful ADO fetch.
 * @param ownEdits        The in-progress edits stored in Zustand.
 * @param addedVars       Locally-created variables not yet pushed to ADO.
 * @param deletedKeys     Existing cloud variable keys staged for deletion.
 */
export function useVariableBuffer(
  cloudVariables: Record<string, AdoVariable> | undefined,
  ownEdits: PendingChange[],
  addedVars: DraftNewVariable[] = [],
  deletedKeys: string[] = []
): VariableBuffer {
  const cloud = cloudVariables ?? {}

  // ── Build merged map ───────────────────────────────────────────────────────
  const merged: Record<string, { value: string; isSecret: boolean }> = {}

  for (const [key, v] of Object.entries(cloud)) {
    merged[key] = { value: v.value ?? '', isSecret: v.isSecret ?? false }
  }

  for (const edit of ownEdits) {
    const existing = merged[edit.key]
    const isSecret = edit.isSecret ?? existing?.isSecret ?? false
    if (edit.newKey && edit.newKey !== edit.key) {
      // Rename: remove old key, write under new key
      delete merged[edit.key]
      merged[edit.newKey] = { value: edit.newValue, isSecret }
    } else {
      merged[edit.key] = { value: edit.newValue, isSecret }
    }
  }

  // Inject locally-created variables (not from cloud).
  for (const v of addedVars) {
    merged[v.key] = { value: v.value, isSecret: false }
  }

  // Remove keys staged for deletion from the push payload.
  const deletedSet = new Set(deletedKeys)
  for (const key of deletedSet) {
    delete merged[key]
  }

  // ── Compute diff ──────────────────────────────────────────────────────────
  const draftChanges: DraftChange[] = []

  const renamedFromKeys = new Set(
    ownEdits.filter((e) => e.newKey && e.newKey !== e.key).map((e) => e.key)
  )

  for (const edit of ownEdits) {
    // If the key is staged for deletion and this is not a rename, show it only in the deleted section.
    if (deletedSet.has(edit.key) && !renamedFromKeys.has(edit.key)) continue

    const cloudVar = cloud[edit.key]
    const cloudValue = cloudVar?.value ?? ''
    const cloudSecret = cloudVar?.isSecret ?? false
    const isSecret = edit.isSecret ?? cloudSecret
    const isRenamed = !!edit.newKey && edit.newKey !== edit.key
    const valueChanged = edit.newValue !== cloudValue
    const secretToggled = edit.isSecret !== undefined && edit.isSecret !== cloudSecret

    if (isRenamed || valueChanged || cloudSecret || secretToggled) {
      draftChanges.push({
        key: edit.key,
        newKey: isRenamed ? edit.newKey : undefined,
        oldValue: cloudVar !== undefined ? cloudValue : undefined,
        newValue: edit.newValue,
        isSecret,
        isRenamed: isRenamed || undefined
      })
    }
  }

  // Append created variables as draft changes.
  for (const v of addedVars) {
    draftChanges.push({
      key: v.key,
      oldValue: undefined,
      newValue: v.value,
      isSecret: false,
      isCreated: true
    })
  }

  // Append deleted variables as draft changes (exclude keys that were renamed away).
  for (const key of deletedKeys) {
    if (renamedFromKeys.has(key)) continue
    const cloudVar = cloud[key]
    if (!cloudVar) continue // safety: only track real cloud vars
    draftChanges.push({
      key,
      oldValue: cloudVar.value ?? '',
      newValue: cloudVar.value ?? '',
      isSecret: cloudVar.isSecret ?? false,
      isDeleted: true
    })
  }

  return {
    mergedVariables: merged,
    draftChanges,
    pendingCount: draftChanges.length
  }
}
