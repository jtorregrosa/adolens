import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExportFormat } from '../components/modals/exportUtils'

export type PaneSplit = '50/50' | '60/40' | '40/60'
export type ThemeMode = 'dark' | 'light' | 'system'
export type TimeoutSeconds = 15 | 30 | 60
export type AiModel =
  // Light — fast inference, lower RAM; confirmed reliable tool calling
  | 'qwen2.5:1.5b'
  | 'llama3.2:3b'
  | 'qwen2.5:3b'
  // Standard — higher quality answers
  | 'phi4-mini'
  | 'qwen2.5:7b'
  | 'llama3.1:8b'

interface SettingsState {
  // Appearance
  theme: ThemeMode
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
  // AI
  aiEnabled: boolean
  aiModel: AiModel

  // Actions
  setTheme: (v: ThemeMode) => void
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
  setAiEnabled: (v: boolean) => void
  setAiModel: (v: AiModel) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      defaultPaneSplit: '50/50',
      compactMode: false,
      confirmBeforeDiscard: false,
      syncScrollEnabled: true,
      warnOnSecretOverwrite: true,
      defaultExportFormat: 'json',
      includeSecretsInExport: true,
      requestTimeoutSeconds: 15,
      orgUrlHistory: [],
      aiEnabled: false,
      aiModel: 'qwen2.5:7b',

      setTheme: (v) => set({ theme: v }),
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
      clearOrgUrlHistory: () => set({ orgUrlHistory: [] }),
      setAiEnabled: (v) => set({ aiEnabled: v }),
      setAiModel: (v) => set({ aiModel: v })
    }),
    { name: 'adolens-settings' }
  )
)
