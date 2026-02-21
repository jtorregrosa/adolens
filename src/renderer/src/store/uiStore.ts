import { create } from 'zustand'

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

  toggleSidebar: () => void
  setSyncScroll: (v: boolean) => void
  setSearchQuery: (q: string) => void
  setLeftPane: (p: Partial<PaneSelection>) => void
  setRightPane: (p: Partial<PaneSelection>) => void
  clearPanes: () => void
}

const emptyPane: PaneSelection = {
  projectId: null,
  projectName: null,
  groupId: null,
  groupName: null
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  syncScroll: true,
  searchQuery: '',

  leftPane: emptyPane,
  rightPane: emptyPane,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSyncScroll: (v) => set({ syncScroll: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLeftPane: (p) => set((s) => ({ leftPane: { ...s.leftPane, ...p } })),
  setRightPane: (p) => set((s) => ({ rightPane: { ...s.rightPane, ...p } })),
  clearPanes: () => set({ leftPane: emptyPane, rightPane: emptyPane })
}))
