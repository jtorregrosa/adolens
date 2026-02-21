import { app, shell, BrowserWindow, ipcMain, safeStorage, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import ElectronStoreImport from 'electron-store'
// electron-store v11 exports as ESM with .default in CJS context
const StoreClass =
  (ElectronStoreImport as unknown as { default: typeof ElectronStoreImport }).default ??
  ElectronStoreImport
import { setupAuthHandlers } from './ipc/auth'
import { setupAdoHandlers } from './ipc/ado'
import { setupFavoritesHandlers } from './ipc/favorites'
import icon from '../../resources/icon.png?asset'

type WindowBounds = { width: number; height: number; x?: number; y?: number }

const store = new StoreClass() as {
  get(key: string): unknown
  set(key: string, value: unknown): void
  delete(key: string): void
}

function ensureVisibleBounds(bounds: WindowBounds): WindowBounds {
  if (bounds.x === undefined || bounds.y === undefined) return bounds

  const displays = screen.getAllDisplays()
  const isVisible = displays.some((display) => {
    const { x, y, width, height } = display.workArea
    return (
      bounds.x! >= x &&
      bounds.y! >= y &&
      bounds.x! + bounds.width <= x + width &&
      bounds.y! + bounds.height <= y + height
    )
  })

  if (!isVisible) {
    // Reset position to primary display center, keep dimensions
    const primary = screen.getPrimaryDisplay()
    const { x, y, width, height } = primary.workArea
    return {
      width: bounds.width,
      height: bounds.height,
      x: Math.round(x + (width - bounds.width) / 2),
      y: Math.round(y + (height - bounds.height) / 2)
    }
  }

  return bounds
}

function createWindow(): void {
  const storedBounds = store.get('windowBounds') as WindowBounds | undefined
  const rawBounds: WindowBounds = storedBounds ?? { width: 1400, height: 860 }
  const bounds = ensureVisibleBounds(rawBounds)

  const mainWindow = new BrowserWindow({
    title: 'ADOLens',
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 47
    },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', () => {
    const b = mainWindow.getBounds()
    store.set('windowBounds', b)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setName('ADOLens')
  electronApp.setAppUserModelId('com.adolens.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPC handlers
  setupAuthHandlers(ipcMain, store, safeStorage)
  setupAdoHandlers(ipcMain, store, safeStorage)
  setupFavoritesHandlers(ipcMain, store)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
