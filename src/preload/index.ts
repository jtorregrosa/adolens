import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/** Typed bridge to the main process */
const api = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  saveCredentials: (orgUrl: string, pat: string) =>
    ipcRenderer.invoke('auth:save-credentials', orgUrl, pat),

  loadCredentials: () => ipcRenderer.invoke('auth:load-credentials'),

  clearCredentials: () => ipcRenderer.invoke('auth:clear-credentials'),

  // ─── ADO API ───────────────────────────────────────────────────────────────
  getProjects: () => ipcRenderer.invoke('ado:get-projects'),

  getVariableGroups: (projectId: string) =>
    ipcRenderer.invoke('ado:get-variable-groups', projectId),

  getVariableGroup: (projectId: string, groupId: number) =>
    ipcRenderer.invoke('ado:get-variable-group', projectId, groupId),

  updateVariableGroup: (
    projectId: string,
    groupId: number,
    variables: Record<string, { value: string; isSecret: boolean }>
  ) => ipcRenderer.invoke('ado:update-variable-group', projectId, groupId, variables),

  cloneVariableGroup: (projectId: string, groupId: number, newName: string) =>
    ipcRenderer.invoke('ado:clone-variable-group', projectId, groupId, newName),

  // ─── Favorites ─────────────────────────────────────────────────────────────
  loadFavorites: () => ipcRenderer.invoke('favorites:load'),

  saveFavorites: (favoriteProjectIds: string[], favoriteLibraryIds: number[]) =>
    ipcRenderer.invoke('favorites:save', favoriteProjectIds, favoriteLibraryIds)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
