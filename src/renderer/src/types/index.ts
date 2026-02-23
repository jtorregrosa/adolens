// ─── Azure DevOps entities ──────────────────────────────────────────────────

export interface AdoProject {
  id: string
  name: string
  description?: string
}

export interface AdoVariable {
  value?: string
  isSecret?: boolean
}

export interface AdoVariableGroupProjectRef {
  projectId?: string
  projectName?: string
  name?: string
  description?: string
}

export interface AdoVariableGroup {
  id: number
  name: string
  description?: string
  variableCount: number
  variables: Record<string, AdoVariable>
  type?: string
  createdOn?: string
  modifiedOn?: string
  createdBy?: string
  createdByImageUrl?: string
  modifiedBy?: string
  modifiedByImageUrl?: string
  isShared?: boolean
  variableGroupProjectReferences?: AdoVariableGroupProjectRef[]
}

// ─── Diff Engine ────────────────────────────────────────────────────────────

export type DiffStatus = 'identical' | 'modified' | 'added' | 'removed' | 'ghost' | 'created'

export interface DiffVariableRow {
  key: string
  /** Status FROM the perspective of the right/target pane */
  status: DiffStatus
  left: AdoVariable | null
  right: AdoVariable | null
}

export interface DiffModel {
  rows: DiffVariableRow[]
  stats: {
    identical: number
    modified: number
    added: number
    removed: number
  }
}

// ─── Edit state ─────────────────────────────────────────────────────────────

export interface PendingChange {
  key: string
  side: 'left' | 'right'
  originalValue?: string
  newValue: string
  /** If set, the variable key is being renamed from `key` to `newKey`. */
  newKey?: string
  /** Override secret flag for this variable when pushing (undefined = use cloud value). */
  isSecret?: boolean
}

/** A brand-new variable that exists only in the local draft (not yet in the cloud). */
export interface DraftNewVariable {
  key: string
  value: string
}
