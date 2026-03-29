const { contextBridge, ipcRenderer } = require('electron')
const { IPC } = require('../shared/constants')

contextBridge.exposeInMainWorld('capslock', {
  // Config
  getProfiles:  () => ipcRenderer.invoke(IPC.PROFILES_GET),
  saveProfiles: (config) => ipcRenderer.invoke(IPC.PROFILES_SAVE, config),
  cycleProfileNext: () => ipcRenderer.invoke(IPC.PROFILE_CYCLE_NEXT),

  // Import/Export
  exportProfiles: () => ipcRenderer.invoke(IPC.PROFILES_EXPORT),
  importProfiles: (options) => ipcRenderer.invoke(IPC.PROFILES_IMPORT, options),
  
  // Validation
  validateProfiles: (profiles) => ipcRenderer.invoke(IPC.PROFILES_VALIDATE, profiles),

  // Hook control
  toggleHook:    (enabled) => ipcRenderer.invoke(IPC.HOOK_TOGGLE, enabled),
  getHookStatus: () => ipcRenderer.invoke(IPC.HOOK_STATUS),
  toggleGameMode: () => ipcRenderer.invoke(IPC.GAME_MODE_TOGGLE),

  // Key recording
  startKeyRecord: () => ipcRenderer.invoke(IPC.KEY_RECORD_START),
  stopKeyRecord:  () => ipcRenderer.invoke(IPC.KEY_RECORD_STOP),

  // Registry (OS-level Caps Lock suppression)
  getRegistryStatus: () => ipcRenderer.invoke(IPC.REGISTRY_STATUS),
  applyRegistry:     () => ipcRenderer.invoke(IPC.REGISTRY_APPLY),
  removeRegistry:    () => ipcRenderer.invoke(IPC.REGISTRY_REMOVE),

  // Language (syncs tray menu to current UI language)
  setLang: (lang) => ipcRenderer.invoke(IPC.LANG_SET, lang),

  // Events from main process
  onProfilesChanged:   (cb) => ipcRenderer.on(IPC.PROFILES_UPDATED,   (_, d) => cb(d)),
  onActiveAppChanged:  (cb) => ipcRenderer.on(IPC.APP_ACTIVE,          (_, d) => cb(d)),
  onProfileCycled:     (cb) => ipcRenderer.on(IPC.PROFILE_CYCLED,      (_, d) => cb(d)),
  onGameModeChanged:   (cb) => ipcRenderer.on(IPC.GAME_MODE_CHANGED,   (_, d) => cb(d)),
  onKeyRecorded:       (cb) => ipcRenderer.on(IPC.KEY_RECORDED,        (_, d) => cb(d)),
  onHookStatusChanged: (cb) => ipcRenderer.on(IPC.HOOK_STATUS_CHANGED, (_, d) => cb(d))
})
