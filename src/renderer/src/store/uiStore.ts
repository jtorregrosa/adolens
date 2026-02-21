import { create } from 'zustand'
import type { PendingChange, DraftNewVariable } from '../types'

interface PaneSelection {
  projectId: string | null
  projectName: string | null
  groupId: number | null
  groupName: string | null
}

interface UIState {
  sidebarCollapsed: boolean
  syncScroll: boolean
  searchQuery: string

  leftPane: PaneSelection
  rightPane: PaneSelection

  // ─── Favorites ─────────────────────────────────────────────────────────────
  favoriteProjectIds: string[]
  favoriteLibraryIds: number[]

  /**
   * Own-pane inline edits, keyed by destination side.
   * Only tracks edits where the user directly edits a cell in that pane
   * (commitEdit path). Cross-copy operations remain local to each DiffTable.
   */
  leftOwnEdits: PendingChange[]
  rightOwnEdits: PendingChange[]

  /** Variables added locally (not yet pushed to ADO) per pane. */
  leftAddedVars: DraftNewVariable[]
  rightAddedVars: DraftNewVariable[]

  /** Cloud variable keys locally marked for deletion (not yet pushed). */
  leftDeletedKeys: string[]
  rightDeletedKeys: string[]

  toggleSidebar: () => void
  setSyncScroll: (v: boolean) => void
  setSearchQuery: (q: string) => void
  setLeftPane: (p: Partial<PaneSelection>) => void
  setRightPane: (p: Partial<PaneSelection>) => void
  clearPanes: () => void

  /** Upsert an own-pane edit; side must match the pane side. */
  upsertOwnEdit: (side: 'left' | 'right', change: PendingChange) => void
  /** Remove one own-pane edit by key. */
  removeOwnEdit: (side: 'left' | 'right', key: string) => void
  /** Clear all own-pane edits for a side. */
  clearOwnEdits: (side: 'left' | 'right') => void

  /** Add or update a locally-drafted new variable. */
  upsertAddedVar: (side: 'left' | 'right', variable: DraftNewVariable) => void
  /** Remove a locally-drafted new variable by key. */
  removeAddedVar: (side: 'left' | 'right', key: string) => void
  /** Clear all locally-drafted new variables for a side. */
  clearAddedVars: (side: 'left' | 'right') => void

  /** Mark an existing cloud variable for deletion in the local draft. */
  markDeleted: (side: 'left' | 'right', key: string) => void
  /** Unmark a variable from local deletion (restore). */
  unmarkDeleted: (side: 'left' | 'right', key: string) => void
  /** Clear all locally-deleted keys for a side. */
  clearDeletedKeys: (side: 'left' | 'right') => void

  // ─── Favorites actions ─────────────────────────────────────────────────────
  /** Hydrate favorites from persisted store (called once on startup). */
  loadFavorites: (projectIds: string[], libraryIds: number[]) => void
  toggleFavoriteProject: (projectId: string) => void
  toggleFavoriteLibrary: (libraryId: number) => void
  isFavoriteProject: (projectId: string) => boolean
  isFavoriteLibrary: (libraryId: number) => boolean
}

const emptyPane: PaneSelection = {
  projectId: null,
  projectName: null,
  groupId: null,
  groupName: null
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  syncScroll: true,
  searchQuery: '',

  leftPane: emptyPane,
  rightPane: emptyPane,
  leftOwnEdits: [],
  rightOwnEdits: [],
  leftAddedVars: [],
  rightAddedVars: [],
  leftDeletedKeys: [],
  rightDeletedKeys: [],

  favoriteProjectIds: [],
  favoriteLibraryIds: [],

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSyncScroll: (v) => set({ syncScroll: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLeftPane: (p) =>
    set((s) => ({
      leftPane: { ...s.leftPane, ...p },
      // Clear own edits and added vars when the group changes
      ...(p.groupId !== undefined && p.groupId !== s.leftPane.groupId
        ? { leftOwnEdits: [], leftAddedVars: [], leftDeletedKeys: [] }
        : {})
    })),
  setRightPane: (p) =>
    set((s) => ({
      rightPane: { ...s.rightPane, ...p },
      ...(p.groupId !== undefined && p.groupId !== s.rightPane.groupId
        ? { rightOwnEdits: [], rightAddedVars: [], rightDeletedKeys: [] }
        : {})
    })),
  clearPanes: () => set({ leftPane: emptyPane, rightPane: emptyPane, leftOwnEdits: [], rightOwnEdits: [], leftAddedVars: [], rightAddedVars: [], leftDeletedKeys: [], rightDeletedKeys: [] }),

  upsertOwnEdit: (side, change) =>
    set((s) => {
      const key = side === 'left' ? 'leftOwnEdits' : 'rightOwnEdits'
      const prev = s[key]
      return {
        [key]: [
          ...prev.filter((c) => c.key !== change.key),
          change
        ]
      }
    }),

  removeOwnEdit: (side, key) =>
    set((s) => {
      const storeKey = side === 'left' ? 'leftOwnEdits' : 'rightOwnEdits'
      return { [storeKey]: s[storeKey].filter((c) => c.key !== key) }
    }),

  clearOwnEdits: (side) =>
    set(side === 'left' ? { leftOwnEdits: [] } : { rightOwnEdits: [] }),

  upsertAddedVar: (side, variable) =>
    set((s) => {
      const k = side === 'left' ? 'leftAddedVars' : 'rightAddedVars'
      return { [k]: [...s[k].filter((v) => v.key !== variable.key), variable] }
    }),

  removeAddedVar: (side, key) =>
    set((s) => {
      const k = side === 'left' ? 'leftAddedVars' : 'rightAddedVars'
      return { [k]: s[k].filter((v) => v.key !== key) }
    }),

  clearAddedVars: (side) =>
    set(side === 'left' ? { leftAddedVars: [] } : { rightAddedVars: [] }),

  markDeleted: (side, key) =>
    set((s) => {
      const k = side === 'left' ? 'leftDeletedKeys' : 'rightDeletedKeys'
      return s[k].includes(key) ? {} : { [k]: [...s[k], key] }
    }),

  unmarkDeleted: (side, key) =>
    set((s) => {
      const k = side === 'left' ? 'leftDeletedKeys' : 'rightDeletedKeys'
      return { [k]: s[k].filter((x) => x !== key) }
    }),

  clearDeletedKeys: (side) =>
    set(side === 'left' ? { leftDeletedKeys: [] } : { rightDeletedKeys: [] }),

  // ─── Favorites ────────────────────────────────────────────────────────────
  loadFavorites: (projectIds, libraryIds) =>
    set({ favoriteProjectIds: projectIds, favoriteLibraryIds: libraryIds }),

  toggleFavoriteProject: (projectId) => {
    set((s) => {
      const next = s.favoriteProjectIds.includes(projectId)
        ? s.favoriteProjectIds.filter((id) => id !== projectId)
        : [...s.favoriteProjectIds, projectId]
      window.api.saveFavorites(next, s.favoriteLibraryIds)
      return { favoriteProjectIds: next }
    })
  },

  toggleFavoriteLibrary: (libraryId) => {
    set((s) => {
      const next = s.favoriteLibraryIds.includes(libraryId)
        ? s.favoriteLibraryIds.filter((id) => id !== libraryId)
        : [...s.favoriteLibraryIds, libraryId]
      window.api.saveFavorites(s.favoriteProjectIds, next)
      return { favoriteLibraryIds: next }
    })
  },

  isFavoriteProject: (projectId) => get().favoriteProjectIds.includes(projectId),
  isFavoriteLibrary: (libraryId) => get().favoriteLibraryIds.includes(libraryId)
}))
