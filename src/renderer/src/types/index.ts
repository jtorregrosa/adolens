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

export interface AdoVariableGroup {
  id: number
  name: string
  description?: string
  variableCount: number
  variables: Record<string, AdoVariable>
}

// ─── Diff Engine ────────────────────────────────────────────────────────────

export type DiffStatus = 'identical' | 'modified' | 'added' | 'removed' | 'ghost'

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
}
