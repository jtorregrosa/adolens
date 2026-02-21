import type { IpcMain } from 'electron'

type AnyStore = { get(key: string): unknown; set(key: string, value: unknown): void }

export interface FavoritesData {
  favoriteProjectIds: string[]
  favoriteLibraryIds: number[]
}

export function setupFavoritesHandlers(ipcMain: IpcMain, store: AnyStore): void {
  /** Load favorites from persistent store */
  ipcMain.handle('favorites:load', async () => {
    try {
      const favoriteProjectIds = (store.get('favoriteProjectIds') as string[] | undefined) ?? []
      const favoriteLibraryIds = (store.get('favoriteLibraryIds') as number[] | undefined) ?? []
      return { ok: true, favoriteProjectIds, favoriteLibraryIds }
    } catch (err) {
      return { ok: false, error: String(err), favoriteProjectIds: [], favoriteLibraryIds: [] }
    }
  })

  /** Persist favorites to store */
  ipcMain.handle(
    'favorites:save',
    async (_event, favoriteProjectIds: string[], favoriteLibraryIds: number[]) => {
      try {
        store.set('favoriteProjectIds', favoriteProjectIds)
        store.set('favoriteLibraryIds', favoriteLibraryIds)
        return { ok: true }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    }
  )
}
