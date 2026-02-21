import type { IpcMain, SafeStorage } from 'electron'

type AnyStore = { get(key: string): unknown; set(key: string, value: unknown): void; delete(key: string): void }

export function setupAuthHandlers(
  ipcMain: IpcMain,
  store: AnyStore,
  safeStorage: SafeStorage
): void {
  /**
   * Save org URL (plain text) + PAT (encrypted via safeStorage)
   */
  ipcMain.handle('auth:save-credentials', async (_event, orgUrl: string, pat: string) => {
    try {
      store.set('orgUrl', orgUrl)
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(pat)
        store.set('encryptedPat', encrypted.toString('base64'))
      } else {
        // Fallback – encode only (not production-secure, but functional on headless envs)
        store.set('encryptedPat', Buffer.from(pat).toString('base64'))
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  /**
   * Load stored org URL and decrypt PAT
   */
  ipcMain.handle('auth:load-credentials', async () => {
    try {
      const orgUrl = store.get('orgUrl') as string | undefined
      const encryptedPat = store.get('encryptedPat') as string | undefined
      if (!orgUrl || !encryptedPat) return { ok: false, error: 'No credentials stored' }

      let pat: string
      if (safeStorage.isEncryptionAvailable()) {
        pat = safeStorage.decryptString(Buffer.from(encryptedPat, 'base64'))
      } else {
        pat = Buffer.from(encryptedPat, 'base64').toString('utf-8')
      }

      return { ok: true, orgUrl, pat }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  /**
   * Clear all stored credentials (logout)
   */
  ipcMain.handle('auth:clear-credentials', async () => {
    store.delete('orgUrl')
    store.delete('encryptedPat')
    return { ok: true }
  })

  }
