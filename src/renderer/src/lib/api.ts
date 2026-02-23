/**
 * Typed wrappers around Tauri `invoke` calls.
 * This module is the single point of contact between the React renderer
 * and the Rust backend — a direct replacement for the old Electron preload bridge.
 */
import { invoke } from '@tauri-apps/api/core'
import type { AdoProject, AdoVariableGroup } from '../types'
export type { AdoProject, AdoVariableGroup }

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  displayName: string
  email: string
  avatarDataUrl: string | null
  orgName: string
}

export async function saveCredentials(
  orgUrl: string,
  pat: string,
  remember: boolean
): Promise<void> {
  await invoke('save_credentials', { orgUrl, pat, remember })
}

export async function loadCredentials(): Promise<{ orgUrl: string } | null> {
  try {
    return await invoke<{ orgUrl: string }>('load_credentials')
  } catch {
    return null
  }
}

export async function clearCredentials(): Promise<void> {
  await invoke('clear_credentials')
}

export async function getUserProfile(): Promise<UserProfile> {
  return invoke<UserProfile>('get_user_profile')
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export async function loadFavorites(): Promise<{
  projectIds: string[]
  libraryIds: number[]
} | null> {
  try {
    return await invoke<{ projectIds: string[]; libraryIds: number[] }>('load_favorites')
  } catch {
    return null
  }
}

export async function saveFavorites(projectIds: string[], libraryIds: number[]): Promise<void> {
  await invoke('save_favorites', { projectIds, libraryIds })
}

// ─── Azure DevOps ─────────────────────────────────────────────────────────────

export async function getProjects(): Promise<AdoProject[]> {
  return invoke<AdoProject[]>('get_projects')
}

export async function getVariableGroups(projectId: string): Promise<AdoVariableGroup[]> {
  return invoke<AdoVariableGroup[]>('get_variable_groups', { projectId })
}

export async function getVariableGroup(
  projectId: string,
  groupId: number
): Promise<AdoVariableGroup> {
  return invoke<AdoVariableGroup>('get_variable_group', { projectId, groupId })
}

export async function cloneVariableGroup(
  projectId: string,
  groupId: number,
  newName: string
): Promise<AdoVariableGroup> {
  return invoke<AdoVariableGroup>('clone_variable_group', { projectId, groupId, newName })
}

export async function updateVariableGroup(
  projectId: string,
  groupId: number,
  variables: Record<string, { value: string; isSecret: boolean }>
): Promise<void> {
  await invoke('update_variable_group', { projectId, groupId, variables })
}

export async function setRequestTimeout(secs: number): Promise<void> {
  await invoke('set_request_timeout', { secs })
}

// ─── AI Assistant ─────────────────────────────────────────────────────────────

export interface AiChatMessage {
  role: string
  content?: string | null
  tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>
}

export async function aiCheckOllama(): Promise<boolean> {
  return invoke<boolean>('ai_check_ollama')
}

export async function aiCheckModel(model: string): Promise<boolean> {
  return invoke<boolean>('ai_check_model', { model })
}

export async function aiPullModel(model: string): Promise<void> {
  await invoke('ai_pull_model', { model })
}

export async function aiChat(messages: AiChatMessage[], model: string): Promise<AiChatMessage> {
  return invoke<AiChatMessage>('ai_chat', { messages, model })
}

/** Returns a short GPU description if Ollama can use one, null if CPU-only. */
export async function aiCheckGpu(): Promise<string | null> {
  return invoke<string | null>('ai_check_gpu')
}
