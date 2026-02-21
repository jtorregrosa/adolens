import type { IpcMain, SafeStorage } from 'electron'
import * as azdev from 'azure-devops-node-api'

type AnyStore = { get(key: string): unknown; set(key: string, value: unknown): void; delete(key: string): void }

function getCredentials(
  store: AnyStore,
  safeStorage: SafeStorage
): { orgUrl: string; pat: string } | null {
  const orgUrl = store.get('orgUrl') as string | undefined
  const encryptedPat = store.get('encryptedPat') as string | undefined
  if (!orgUrl || !encryptedPat) return null

  let pat: string
  if (safeStorage.isEncryptionAvailable()) {
    pat = safeStorage.decryptString(Buffer.from(encryptedPat, 'base64'))
  } else {
    pat = Buffer.from(encryptedPat, 'base64').toString('utf-8')
  }
  return { orgUrl, pat }
}

async function getConnection(
  store: AnyStore,
  safeStorage: SafeStorage
): Promise<azdev.WebApi> {
  const creds = getCredentials(store, safeStorage)
  if (!creds) throw new Error('Not authenticated')

  const authHandler = azdev.getPersonalAccessTokenHandler(creds.pat)
  return new azdev.WebApi(creds.orgUrl, authHandler)
}

export function setupAdoHandlers(
  ipcMain: IpcMain,
  store: AnyStore,
  safeStorage: SafeStorage
): void {
  /** Validate connectivity by fetching projects */
  ipcMain.handle('ado:get-projects', async () => {
    try {
      const connection = await getConnection(store, safeStorage)
      const coreApi = await connection.getCoreApi()
      const projects = await coreApi.getProjects()
      return {
        ok: true,
        data: projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description
        }))
      }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  /** Fetch variable groups for a project */
  ipcMain.handle('ado:get-variable-groups', async (_event, projectId: string) => {
    try {
      const connection = await getConnection(store, safeStorage)
      const taskAgentApi = await connection.getTaskAgentApi()
      const groups = await taskAgentApi.getVariableGroups(projectId)
      return {
        ok: true,
        data: groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          variableCount: Object.keys(g.variables ?? {}).length,
          variables: g.variables
        }))
      }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  /** Fetch a single variable group by ID */
  ipcMain.handle('ado:get-variable-group', async (_event, projectId: string, groupId: number) => {
    try {
      const connection = await getConnection(store, safeStorage)
      const taskAgentApi = await connection.getTaskAgentApi()
      const allGroups = await taskAgentApi.getVariableGroups(projectId)
      const g = allGroups.find((group) => group.id === groupId)
      if (!g) throw new Error('Variable group not found')
      return {
        ok: true,
        data: {
          id: g.id,
          name: g.name,
          description: g.description,
          variableCount: Object.keys(g.variables ?? {}).length,
          variables: g.variables
        }
      }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  /** Update a variable group */
  ipcMain.handle(
    'ado:update-variable-group',
    async (
      _event,
      projectId: string,
      groupId: number,
      variables: Record<string, { value: string; isSecret: boolean }>
    ) => {
      try {
        const connection = await getConnection(store, safeStorage)
        const taskAgentApi = await connection.getTaskAgentApi()
        const existing = (await taskAgentApi.getVariableGroups(projectId, undefined, groupId))[0]
        if (!existing) throw new Error('Variable group not found')

        const updatedVariables: Record<string, { value?: string; isSecret?: boolean }> = {}
        for (const [key, val] of Object.entries(variables)) {
          updatedVariables[key] = {
            value: val.isSecret ? undefined : val.value,
            isSecret: val.isSecret
          }
        }

        await taskAgentApi.updateVariableGroup(
          { ...existing, variables: updatedVariables },
          groupId
        )
        return { ok: true }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    }
  )
}
