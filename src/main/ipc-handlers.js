const { ipcMain } = require('electron')
const { IPC } = require('../shared/constants')
const hook = require('./hook')
const registry = require('./registry')
const { updateContextMenu, setTrayLang } = require('./tray')

function setupIpcHandlers (mainWindow, profileManager) {
  ipcMain.handle(IPC.PROFILES_GET, () => {
    return profileManager.getAll()
  })

  ipcMain.handle(IPC.PROFILES_SAVE, (_, newConfig) => {
    try {
      profileManager.saveAll(newConfig)
      mainWindow.webContents.send(IPC.PROFILES_UPDATED, newConfig)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle(IPC.HOOK_TOGGLE, (_, enabled) => {
    hook.setEnabled(enabled)
    updateContextMenu()
    mainWindow.webContents.send(IPC.HOOK_STATUS_CHANGED, hook.getStatus())
  })

  ipcMain.handle(IPC.HOOK_STATUS, () => {
    return hook.getStatus()
  })

  ipcMain.handle(IPC.KEY_RECORD_START, () => {
    hook.startRecording()
  })

  ipcMain.handle(IPC.KEY_RECORD_STOP, () => {
    hook.stopRecording()
  })

  // Registry: OS-level Caps Lock -> F13 scancode map
  ipcMain.handle(IPC.REGISTRY_STATUS, () => {
    return { remapped: registry.isRemapped() }
  })

  ipcMain.handle(IPC.REGISTRY_APPLY, () => {
    return registry.applyRemap()
  })

  ipcMain.handle(IPC.REGISTRY_REMOVE, () => {
    return registry.removeRemap()
  })

  // Language change: update tray menu labels
  ipcMain.handle(IPC.LANG_SET, (_, lang) => {
    setTrayLang(lang)
  })
}

module.exports = { setupIpcHandlers }
