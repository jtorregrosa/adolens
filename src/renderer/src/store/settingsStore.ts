import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExportFormat } from '../components/modals/exportUtils'

export type PaneSplit = '50/50' | '60/40' | '40/60'
export type TimeoutSeconds = 15 | 30 | 60

interface SettingsState {
  // Appearance
  defaultPaneSplit: PaneSplit
  compactMode: boolean
  // Behavior
  confirmBeforeDiscard: boolean
  syncScrollEnabled: boolean
  warnOnSecretOverwrite: boolean
  // Export / Import
  defaultExportFormat: ExportFormat
  includeSecretsInExport: boolean
  // Connection
  requestTimeoutSeconds: TimeoutSeconds
  orgUrlHistory: string[]

  // Actions
  setDefaultPaneSplit: (v: PaneSplit) => void
  setCompactMode: (v: boolean) => void
  setConfirmBeforeDiscard: (v: boolean) => void
  setSyncScrollEnabled: (v: boolean) => void
  setWarnOnSecretOverwrite: (v: boolean) => void
  setDefaultExportFormat: (v: ExportFormat) => void
  setIncludeSecretsInExport: (v: boolean) => void
  setRequestTimeoutSeconds: (v: TimeoutSeconds) => void
  addOrgUrlToHistory: (url: string) => void
  removeOrgUrlFromHistory: (url: string) => void
  clearOrgUrlHistory: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultPaneSplit: '50/50',
      compactMode: false,
      confirmBeforeDiscard: false,
      syncScrollEnabled: true,
      warnOnSecretOverwrite: true,
      defaultExportFormat: 'json',
      includeSecretsInExport: true,
      requestTimeoutSeconds: 15,
      orgUrlHistory: [],

      setDefaultPaneSplit: (v) => set({ defaultPaneSplit: v }),
      setCompactMode: (v) => set({ compactMode: v }),
      setConfirmBeforeDiscard: (v) => set({ confirmBeforeDiscard: v }),
      setSyncScrollEnabled: (v) => set({ syncScrollEnabled: v }),
      setWarnOnSecretOverwrite: (v) => set({ warnOnSecretOverwrite: v }),
      setDefaultExportFormat: (v) => set({ defaultExportFormat: v }),
      setIncludeSecretsInExport: (v) => set({ includeSecretsInExport: v }),
      setRequestTimeoutSeconds: (v) => set({ requestTimeoutSeconds: v }),
      addOrgUrlToHistory: (url) =>
        set((s) => ({
          orgUrlHistory: [url, ...s.orgUrlHistory.filter((u) => u !== url)].slice(0, 8)
        })),
      removeOrgUrlFromHistory: (url) =>
        set((s) => ({ orgUrlHistory: s.orgUrlHistory.filter((u) => u !== url) })),
      clearOrgUrlHistory: () => set({ orgUrlHistory: [] })
    }),
    { name: 'adolens-settings' }
  )
)
