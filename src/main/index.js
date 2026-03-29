const { app, BrowserWindow, globalShortcut } = require('electron')
const path = require('path')
const { setupTray } = require('./tray')
const hook = require('./hook')
const windowDetector = require('./window-detector')
const profileManager = require('./profile-manager')
const { setupIpcHandlers } = require('./ipc-handlers')
const { IPC } = require('../shared/constants')

const SHORTCUT_NEXT_PROFILE = 'CommandOrControl+Alt+]'
const SHORTCUT_GAME_MODE = 'CommandOrControl+Alt+G'

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Prevent Electron from intercepting media keys that may race with iohook
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService')

let mainWindow = null

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 580,
    minWidth: 700,
    minHeight: 480,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    resizable: true,
    backgroundColor: '#1a1a2e',
    icon: path.join(__dirname, '../../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    title: 'CAPSLOCK'
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  mainWindow.setMenuBarVisibility(false)

  // Hide instead of close so the app keeps running in the system tray
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  return mainWindow
}

function registerGlobalShortcuts () {
  const nextRegistered = globalShortcut.register(SHORTCUT_NEXT_PROFILE, () => {
    const profile = profileManager.cycleProfile(1)
    if (mainWindow && !mainWindow.isDestroyed() && profile) {
      mainWindow.webContents.send(IPC.PROFILE_CYCLED, { id: profile.id, name: profile.name })
      mainWindow.webContents.send(IPC.HOOK_STATUS_CHANGED, hook.getStatus())
    }
  })

  const gameModeRegistered = globalShortcut.register(SHORTCUT_GAME_MODE, () => {
    const enabled = profileManager.toggleGameMode()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.GAME_MODE_CHANGED, { enabled })
      mainWindow.webContents.send(IPC.HOOK_STATUS_CHANGED, hook.getStatus())
    }
    try {
      const { updateContextMenu } = require('./tray')
      updateContextMenu()
    } catch (e) {
      console.warn('[shortcut] failed to refresh tray after game mode toggle:', e.message)
    }
  })

  if (!nextRegistered) {
    console.warn(`[shortcut] failed to register ${SHORTCUT_NEXT_PROFILE}`)
  }
  if (!gameModeRegistered) {
    console.warn(`[shortcut] failed to register ${SHORTCUT_GAME_MODE}`)
  }
}

app.whenReady().then(() => {
  try {
    profileManager.load()
  } catch (e) {
    console.error('[startup] profileManager.load() failed:', e.message)
  }

  const win = createWindow()
  
  try {
    setupIpcHandlers(win, profileManager)
  } catch (e) {
    console.error('[startup] setupIpcHandlers() failed:', e.message)
  }
  
  try {
    setupTray(win)
  } catch (e) {
    console.error('[startup] setupTray() failed:', e.message)
  }
  
  try {
    windowDetector.start(win)
  } catch (e) {
    console.error('[startup] windowDetector.start() failed:', e.message)
  }
  
  try {
    hook.start(win)
  } catch (e) {
    console.error('[startup] hook.start() failed:', e.message)
  }

  try {
    registerGlobalShortcuts()
  } catch (e) {
    console.error('[startup] registerGlobalShortcuts() failed:', e.message)
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
  globalShortcut.unregisterAll()
  try {
    hook.stop()
  } catch (e) {
    console.error('[cleanup] hook.stop() failed:', e.message)
  }
  try {
    windowDetector.stop()
  } catch (e) {
    console.error('[cleanup] windowDetector.stop() failed:', e.message)
  }
})

// Focus existing window if a second instance is launched
app.on('second-instance', () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
  }
})

// Prevent the app from quitting when all windows are closed
// (it lives in the system tray)
app.on('window-all-closed', (e) => {
  e.preventDefault()
})
