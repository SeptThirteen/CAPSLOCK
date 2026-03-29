const Store = require('electron-store')
const windowDetector = require('./window-detector')

function generateId () {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

const defaultConfig = {
  version: 1,
  enabled: true,
  macroSpeedMs: 10,
  profiles: [
    {
      id: 'default',
      name: 'Default',
      matcher: null,
      mapping: { type: 'key', key: 'escape' }
    }
  ]
}

let store = null
let config = null
let manualProfileId = null
let gameModeEnabled = false

function load () {
  store = new Store({ name: 'config', defaults: defaultConfig })
  config = store.store

  if (!config.profiles || config.profiles.length === 0) {
    config = JSON.parse(JSON.stringify(defaultConfig))
    store.store = config
  }

  // Sync macro speed into simulator on load
  if (typeof config.macroSpeedMs === 'number') {
    require('./key-simulator').setAutoDelay(config.macroSpeedMs)
  }
}

function getAll () {
  return config
}

function saveAll (newConfig) {
  config = newConfig
  store.store = config

  if (manualProfileId && !config.profiles.some(p => p.id === manualProfileId)) {
    manualProfileId = null
  }

  if (typeof config.macroSpeedMs === 'number') {
    require('./key-simulator').setAutoDelay(config.macroSpeedMs)
  }
}

function getActiveProfile () {
  if (manualProfileId) {
    const manual = config?.profiles?.find(p => p.id === manualProfileId)
    if (manual) return manual
    manualProfileId = null
  }

  return getMatchedProfile()
}

function getMatchedProfile () {
  if (!config || !config.profiles || config.profiles.length === 0) return null

  const { processName, windowTitle } = windowDetector.getCachedWindow()

  // First match among non-default (specific app) profiles
  for (const profile of config.profiles) {
    if (profile.matcher === null) continue
    if (matchesWindow(profile.matcher, processName, windowTitle)) {
      return profile
    }
  }

  // Fallback: default profile (matcher === null)
  return config.profiles.find(p => p.matcher === null) || config.profiles[0]
}

function cycleProfile (direction = 1) {
  if (!config || !Array.isArray(config.profiles) || config.profiles.length === 0) return null

  const list = config.profiles
  const step = direction >= 0 ? 1 : -1
  let currentIndex = list.findIndex(p => p.id === manualProfileId)

  if (currentIndex < 0) {
    const active = getMatchedProfile()
    currentIndex = list.findIndex(p => p.id === active?.id)
  }
  if (currentIndex < 0) currentIndex = 0

  const nextIndex = (currentIndex + step + list.length) % list.length
  manualProfileId = list[nextIndex].id
  return list[nextIndex]
}

function clearManualProfile () {
  manualProfileId = null
}

function getManualProfileId () {
  return manualProfileId
}

function setGameModeEnabled (enabled) {
  gameModeEnabled = !!enabled
  return gameModeEnabled
}

function toggleGameMode () {
  gameModeEnabled = !gameModeEnabled
  return gameModeEnabled
}

function isGameModeEnabled () {
  return gameModeEnabled
}

function matchesWindow (matcher, processName, windowTitle) {
  if (!matcher) return false

  if (matcher.processName) {
    const target = matcher.processName
    const actual = processName || ''
    const type = matcher.processNameMatchType || 'exact'
    if (type === 'exact') {
      if (actual.toLowerCase() !== target.toLowerCase()) return false
    } else if (type === 'contains') {
      if (!actual.toLowerCase().includes(target.toLowerCase())) return false
    } else if (type === 'regex') {
      try { if (!new RegExp(target, 'i').test(actual)) return false } catch { return false }
    }
  }

  if (matcher.windowTitle) {
    const target = matcher.windowTitle
    const actual = windowTitle || ''
    const type = matcher.windowTitleMatchType || 'contains'
    if (type === 'contains') {
      if (!actual.toLowerCase().includes(target.toLowerCase())) return false
    } else if (type === 'regex') {
      try { if (!new RegExp(target, 'i').test(actual)) return false } catch { return false }
    }
  }

  return true
}

function createProfile () {
  return {
    id: generateId(),
    name: 'New Profile',
    matcher: {
      processName: '',
      processNameMatchType: 'exact',
      windowTitle: null,
      windowTitleMatchType: 'contains'
    },
    mapping: { type: 'key', key: 'escape' }
  }
}

module.exports = {
  load,
  getAll,
  saveAll,
  getActiveProfile,
  createProfile,
  generateId,
  cycleProfile,
  clearManualProfile,
  getManualProfileId,
  setGameModeEnabled,
  toggleGameMode,
  isGameModeEnabled
}
