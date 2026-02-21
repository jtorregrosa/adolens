import { ElectronAPI } from '@electron-toolkit/preload'

export interface AdoProject {
  id: string
  name: string
  description?: string
}

export interface AdoVariableGroup {
  id: number
  name: string
  description?: string
  variableCount: number
  variables: Record<string, { value?: string; isSecret?: boolean }>
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string }

export interface IpcApi {
  saveCredentials(orgUrl: string, pat: string): Promise<{ ok: boolean; error?: string }>
  loadCredentials(): Promise<{ ok: boolean; orgUrl?: string; pat?: string; error?: string }>
  clearCredentials(): Promise<{ ok: boolean }>
  getProjects(): Promise<ApiResponse<AdoProject[]>>
  getVariableGroups(projectId: string): Promise<ApiResponse<AdoVariableGroup[]>>
  getVariableGroup(projectId: string, groupId: number): Promise<ApiResponse<AdoVariableGroup>>
  updateVariableGroup(
    projectId: string,
    groupId: number,
    variables: Record<string, { value: string; isSecret: boolean }>
  ): Promise<{ ok: boolean; error?: string }>
  cloneVariableGroup(
    projectId: string,
    groupId: number,
    newName: string
  ): Promise<ApiResponse<AdoVariableGroup>>
  showConfirmDialog(opts: {
    title: string
    message: string
    detail?: string
    buttons: string[]
    defaultId: number
    cancelId: number
  }): Promise<number>
  loadFavorites(): Promise<{
    ok: boolean
    favoriteProjectIds: string[]
    favoriteLibraryIds: number[]
    error?: string
  }>
  saveFavorites(
    favoriteProjectIds: string[],
    favoriteLibraryIds: number[]
  ): Promise<{ ok: boolean; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: IpcApi
  }
}
