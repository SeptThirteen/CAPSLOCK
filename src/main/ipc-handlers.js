const { ipcMain, dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const { IPC } = require('../shared/constants')
const hook = require('./hook')
const registry = require('./registry')
const { updateContextMenu, setTrayLang } = require('./tray')

/**
 * Validate profiles for conflicts
 * @param {Array} profiles - Array of profile objects
 * @returns {Object} - { conflicts: Array, warnings: Array }
 */
function validateProfiles (profiles) {
  const conflicts = []
  const warnings = []

  if (!Array.isArray(profiles)) {
    return { conflicts, warnings }
  }

  // Group profiles by process name for conflict detection
  const processGroups = {}
  
  profiles.forEach((profile, index) => {
    // Skip default profile (no matcher)
    if (!profile.matcher || !profile.matcher.processName) {
      return
    }

    const processName = profile.matcher.processName.toLowerCase()
    const matchType = profile.matcher.processNameMatchType || 'exact'
    const key = `${processName}|${matchType}`

    if (!processGroups[key]) {
      processGroups[key] = []
    }
    processGroups[key].push({ profile, index })
  })

  // Check for duplicate process matchers
  for (const [key, group] of Object.entries(processGroups)) {
    if (group.length > 1) {
      const names = group.map(g => g.profile.name).join(', ')
      const [processName] = key.split('|')
      conflicts.push({
        type: 'duplicate_process',
        severity: 'warning',
        message: `Multiple profiles match "${processName}": ${names}`,
        messageZh: `多个配置匹配同一进程 "${processName}": ${names}`,
        profiles: group.map(g => g.profile.id)
      })
    }
  }

  // Check for empty mappings
  profiles.forEach(profile => {
    if (!profile.mapping) {
      warnings.push({
        type: 'empty_mapping',
        severity: 'info',
        message: `Profile "${profile.name}" has no mapping configured`,
        messageZh: `配置 "${profile.name}" 未设置映射`,
        profiles: [profile.id]
      })
    } else if (profile.mapping.type === 'key' && !profile.mapping.key) {
      warnings.push({
        type: 'empty_key',
        severity: 'warning',
        message: `Profile "${profile.name}" has empty key mapping`,
        messageZh: `配置 "${profile.name}" 的按键映射为空`,
        profiles: [profile.id]
      })
    } else if (profile.mapping.type === 'combo' && (!profile.mapping.keys || profile.mapping.keys.length === 0)) {
      warnings.push({
        type: 'empty_combo',
        severity: 'warning',
        message: `Profile "${profile.name}" has empty combo mapping`,
        messageZh: `配置 "${profile.name}" 的组合键映射为空`,
        profiles: [profile.id]
      })
    } else if (profile.mapping.type === 'macro' && (!profile.mapping.sequence || profile.mapping.sequence.length === 0)) {
      warnings.push({
        type: 'empty_macro',
        severity: 'warning',
        message: `Profile "${profile.name}" has empty macro sequence`,
        messageZh: `配置 "${profile.name}" 的宏序列为空`,
        profiles: [profile.id]
      })
    }
  })

  // Check for profiles with empty matchers (non-default)
  profiles.forEach(profile => {
    if (profile.matcher && !profile.matcher.processName && !profile.matcher.windowTitle) {
      warnings.push({
        type: 'empty_matcher',
        severity: 'info',
        message: `Profile "${profile.name}" has no app matching criteria`,
        messageZh: `配置 "${profile.name}" 未设置应用匹配条件`,
        profiles: [profile.id]
      })
    }
  })

  return { conflicts, warnings }
}

function setupIpcHandlers (mainWindow, profileManager) {
  ipcMain.handle(IPC.PROFILES_GET, () => {
    try {
      return profileManager.getAll()
    } catch (e) {
      console.error('[ipc] PROFILES_GET failed:', e.message)
      return { version: 1, enabled: true, profiles: [] }
    }
  })

  ipcMain.handle(IPC.PROFILES_SAVE, (_, newConfig) => {
    try {
      profileManager.saveAll(newConfig)
      mainWindow.webContents.send(IPC.PROFILES_UPDATED, newConfig)
      return { success: true }
    } catch (e) {
      console.error('[ipc] PROFILES_SAVE failed:', e.message)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle(IPC.PROFILE_CYCLE_NEXT, () => {
    try {
      const profile = profileManager.cycleProfile(1)
      if (!profile) return { success: false, error: 'No profiles available' }

      const payload = { id: profile.id, name: profile.name }
      mainWindow.webContents.send(IPC.PROFILE_CYCLED, payload)
      mainWindow.webContents.send(IPC.HOOK_STATUS_CHANGED, hook.getStatus())
      return { success: true, profile: payload }
    } catch (e) {
      console.error('[ipc] PROFILE_CYCLE_NEXT failed:', e.message)
      return { success: false, error: e.message }
    }
  })

  // Export profiles to file
  ipcMain.handle(IPC.PROFILES_EXPORT, async () => {
    try {
      const config = profileManager.getAll()
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: config.version || 1,
        profiles: config.profiles || []
      }

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Profiles',
        defaultPath: `capslock-profiles-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true }
      }

      fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
      return { success: true, path: result.filePath }
    } catch (e) {
      console.error('[ipc] PROFILES_EXPORT failed:', e.message)
      return { success: false, error: e.message }
    }
  })

  // Import profiles from file
  ipcMain.handle(IPC.PROFILES_IMPORT, async (_, options = {}) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Profiles',
        filters: [
          { name: 'JSON Files', extensions: ['json'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      const filePath = result.filePaths[0]
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const importData = JSON.parse(fileContent)

      // Validate import data structure
      if (!importData.profiles || !Array.isArray(importData.profiles)) {
        return { success: false, error: 'Invalid file format: missing profiles array' }
      }

      const currentConfig = profileManager.getAll()
      const { merge = false } = options

      if (merge) {
        // Merge: add imported profiles, skip duplicates by id
        const existingIds = new Set(currentConfig.profiles.map(p => p.id))
        const newProfiles = importData.profiles.filter(p => !existingIds.has(p.id))
        
        // Generate new IDs for imported profiles to avoid conflicts
        newProfiles.forEach(p => {
          p.id = profileManager.generateId()
        })
        
        currentConfig.profiles = [...currentConfig.profiles, ...newProfiles]
        profileManager.saveAll(currentConfig)
        
        return { 
          success: true, 
          imported: newProfiles.length,
          skipped: importData.profiles.length - newProfiles.length
        }
      } else {
        // Replace: use imported profiles as-is but keep default if present
        const hasDefault = importData.profiles.some(p => p.matcher === null)
        
        if (!hasDefault) {
          // Keep existing default profile
          const existingDefault = currentConfig.profiles.find(p => p.matcher === null)
          if (existingDefault) {
            importData.profiles.unshift(existingDefault)
          }
        }
        
        currentConfig.profiles = importData.profiles
        profileManager.saveAll(currentConfig)
        mainWindow.webContents.send(IPC.PROFILES_UPDATED, currentConfig)
        
        return { success: true, imported: importData.profiles.length }
      }
    } catch (e) {
      console.error('[ipc] PROFILES_IMPORT failed:', e.message)
      return { success: false, error: e.message }
    }
  })

  // Validate profiles for conflicts
  ipcMain.handle(IPC.PROFILES_VALIDATE, (_, profiles) => {
    try {
      return validateProfiles(profiles)
    } catch (e) {
      console.error('[ipc] PROFILES_VALIDATE failed:', e.message)
      return { conflicts: [], warnings: [] }
    }
  })

  ipcMain.handle(IPC.HOOK_TOGGLE, (_, enabled) => {
    try {
      hook.setEnabled(enabled)
      updateContextMenu()
      mainWindow.webContents.send(IPC.HOOK_STATUS_CHANGED, hook.getStatus())
    } catch (e) {
      console.error('[ipc] HOOK_TOGGLE failed:', e.message)
    }
  })

  ipcMain.handle(IPC.HOOK_STATUS, () => {
    try {
      return hook.getStatus()
    } catch (e) {
      console.error('[ipc] HOOK_STATUS failed:', e.message)
      return { enabled: false, running: false }
    }
  })

  ipcMain.handle(IPC.GAME_MODE_TOGGLE, () => {
    try {
      const enabled = profileManager.toggleGameMode()
      updateContextMenu()
      const payload = { enabled }
      mainWindow.webContents.send(IPC.GAME_MODE_CHANGED, payload)
      mainWindow.webContents.send(IPC.HOOK_STATUS_CHANGED, hook.getStatus())
      return payload
    } catch (e) {
      console.error('[ipc] GAME_MODE_TOGGLE failed:', e.message)
      return { enabled: false, error: e.message }
    }
  })

  ipcMain.handle(IPC.KEY_RECORD_START, () => {
    try {
      hook.startRecording()
    } catch (e) {
      console.error('[ipc] KEY_RECORD_START failed:', e.message)
    }
  })

  ipcMain.handle(IPC.KEY_RECORD_STOP, () => {
    try {
      hook.stopRecording()
    } catch (e) {
      console.error('[ipc] KEY_RECORD_STOP failed:', e.message)
    }
  })

  // Registry: OS-level Caps Lock -> F13 scancode map
  ipcMain.handle(IPC.REGISTRY_STATUS, () => {
    try {
      return { remapped: registry.isRemapped() }
    } catch (e) {
      console.error('[ipc] REGISTRY_STATUS failed:', e.message)
      return { remapped: false }
    }
  })

  ipcMain.handle(IPC.REGISTRY_APPLY, () => {
    try {
      return registry.applyRemap()
    } catch (e) {
      console.error('[ipc] REGISTRY_APPLY failed:', e.message)
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle(IPC.REGISTRY_REMOVE, () => {
    try {
      return registry.removeRemap()
    } catch (e) {
      console.error('[ipc] REGISTRY_REMOVE failed:', e.message)
      return { ok: false, error: e.message }
    }
  })

  // Language change: update tray menu labels
  ipcMain.handle(IPC.LANG_SET, (_, lang) => {
    try {
      setTrayLang(lang)
    } catch (e) {
      console.error('[ipc] LANG_SET failed:', e.message)
    }
  })
}

module.exports = { setupIpcHandlers, validateProfiles }
