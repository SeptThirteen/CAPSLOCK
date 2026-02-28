const { app, BrowserWindow } = require('electron')
const path = require('path')
const { setupTray } = require('./tray')
const hook = require('./hook')
const windowDetector = require('./window-detector')
const profileManager = require('./profile-manager')
const { setupIpcHandlers } = require('./ipc-handlers')

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

  // Hide instead of close so the app keeps running in the system tray
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  return mainWindow
}

app.whenReady().then(() => {
  profileManager.load()

  const win = createWindow()
  setupIpcHandlers(win, profileManager)
  setupTray(win)
  windowDetector.start(win)
  hook.start(win)
})

app.on('before-quit', () => {
  app.isQuitting = true
  hook.stop()
  windowDetector.stop()
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
