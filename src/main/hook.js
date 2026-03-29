// hook.js — Keyboard hook using uiohook-napi (N-API, no rebuild needed)
//
// CapsLock suppression is now handled purely through the keyboard hook
// by intercepting and consuming the CapsLock keydown event before it
// reaches the system. No registry modification required.

let uIOhook    = null
let UiohookKey = null

try {
  const mod = require('uiohook-napi')
  uIOhook    = mod.uIOhook
  UiohookKey = mod.UiohookKey
} catch (e) {
  console.error('[hook] uiohook-napi unavailable:', e.message)
}

// Build the set of modifier keycodes from the UiohookKey enum so we can
// skip them during recording and wait for the actual (non-modifier) key.
function buildModifierSet () {
  if (UiohookKey) {
    const s = new Set()
    const MODS = ['ctrl', 'shift', 'alt', 'meta']
    for (const [name, val] of Object.entries(UiohookKey)) {
      if (MODS.some(m => name.toLowerCase().includes(m))) s.add(val)
    }
    if (s.size > 0) return s
  }
  // Fallback: known PS/2 scancodes used by uiohook-napi on Windows
  return new Set([29, 97, 42, 54, 56, 100, 125, 126])
}

const MODIFIER_KEYCODES = buildModifierSet()

const { IPC } = require('../shared/constants')

let enabled    = true
let recording  = false
let mainWindow = null
let suppressionEnabled = true  // Enable CapsLock suppression by default

function getProfileManager () { return require('./profile-manager') }
function getKeySimulator   () { return require('./key-simulator')   }

// Build a reverse map: UiohookKey numeric value → lowercased member name
function buildReverseMap () {
  if (!UiohookKey) return {}
  const m = {}
  for (const [name, val] of Object.entries(UiohookKey)) {
    m[val] = name.toLowerCase()
  }
  return m
}

// Some UiohookKey member names differ from the key names in key-simulator VK map
const UIOHOOK_NAME_ALIASES = {
  arrowleft:   'left',
  arrowright:  'right',
  arrowup:     'up',
  arrowdown:   'down',
  return:      'enter',
  backspace:   'backspace',
  openbracket: '[',
  closebracket:']',
  backquote:   '`',
  backslash:   '\\'
}

function toConfigKey (uiohookName) {
  const lower = uiohookName.toLowerCase()
  return UIOHOOK_NAME_ALIASES[lower] ?? lower
}

// Force CapsLock LED off using keybd_event
function turnOffCapsLockLED () {
  try {
    const koffi = require('koffi')
    const user32 = koffi.load('user32.dll')
    const GetKeyState = user32.func('short GetKeyState(int nVirtKey)')
    const keybd_event = user32.func('void keybd_event(uint8 bVk, uint8 bScan, uint32 dwFlags, uint32 dwExtraInfo)')
    const VK_CAPITAL        = 0x14
    const KEYEVENTF_KEYDOWN = 0x0000
    const KEYEVENTF_KEYUP   = 0x0002
    
    const isToggled = (GetKeyState(VK_CAPITAL) & 0x0001) !== 0
    if (isToggled) {
      // Toggle CapsLock off by simulating a keypress
      keybd_event(VK_CAPITAL, 0x3A, KEYEVENTF_KEYDOWN, 0)
      keybd_event(VK_CAPITAL, 0x3A, KEYEVENTF_KEYUP,   0)
    }
  } catch { /* koffi not available — non-fatal */ }
}

// Prevent CapsLock state from toggling by immediately un-toggling it
function preventCapsLockToggle () {
  // Schedule the LED correction after a small delay to let the toggle happen first
  setImmediate(() => {
    turnOffCapsLockLED()
  })
}

function start (win) {
  if (!uIOhook || !UiohookKey) {
    console.warn('[hook] uiohook-napi not loaded — keyboard hook disabled')
    return
  }

  mainWindow = win

  console.log('[hook] Starting with hook-based CapsLock suppression')
  
  // Ensure CapsLock LED is off at startup
  turnOffCapsLockLED()

  uIOhook.on('keydown', handleKeydown)
  uIOhook.on('keyup',   handleKeyup)
  uIOhook.start()
}

function handleKeydown (event) {
  const isCapsLockEvent = event.keycode === UiohookKey.CapsLock
  const isRemappedCapsEvent = event.keycode === UiohookKey.F13

  // Handle CapsLock from direct key events and registry-remapped F13 events
  if (isCapsLockEvent || isRemappedCapsEvent) {
    if (!enabled) {
      // If hook is disabled, let CapsLock work normally
      return
    }
    
    // Suppress the CapsLock toggle effect
    if (isCapsLockEvent && suppressionEnabled) {
      preventCapsLockToggle()
    }
    
    if (recording) return  // don't trigger action while recording a different key

    if (getProfileManager().isGameModeEnabled()) return

    const profile = getProfileManager().getActiveProfile()
    if (profile && profile.mapping) {
      if (profile.mapping.type === 'disable') return
      setImmediate(() => getKeySimulator().simulateMapping(profile.mapping))
    }
    return
  }

  // Capture any non-target key press while recording.
  // Skip modifier-only keypresses so the user can hold Ctrl/Shift/Alt and
  // then press the actual key — all modifiers arrive via event.ctrlKey etc.
  if (recording) {
    if (MODIFIER_KEYCODES.has(event.keycode)) return  // wait for real key

    recording = false

    const reverseMap   = buildReverseMap()
    const uiohookName  = reverseMap[event.keycode] ?? String(event.keycode)
    const configKey    = toConfigKey(uiohookName)
    const displayLabel = uiohookName.charAt(0).toUpperCase() + uiohookName.slice(1)

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.KEY_RECORDED, {
        key: configKey,
        displayLabel,
        modifiers: {
          ctrl:  !!event.ctrlKey,
          shift: !!event.shiftKey,
          alt:   !!event.altKey,
          meta:  !!event.metaKey
        }
      })
    }
  }
}

function handleKeyup (/* event */) {
  // Key-up handling is managed by key-simulator (SendInput keyup events)
}

function stop () {
  if (!uIOhook) return
  try {
    uIOhook.stop()
    uIOhook.removeAllListeners()
  } catch { /* ignore shutdown errors */ }
}

function setEnabled (val)  { enabled = !!val }
function isEnabled  ()     { return enabled }
function startRecording () { recording = true }
function stopRecording  () { recording = false }
function getStatus () {
  const profileManager = getProfileManager()
  return {
    enabled,
    running: true,
    suppression: suppressionEnabled,
    gameMode: profileManager.isGameModeEnabled(),
    manualProfileId: profileManager.getManualProfileId()
  }
}

// Set suppression mode
function setSuppression (val) {
  suppressionEnabled = !!val
  if (suppressionEnabled) {
    turnOffCapsLockLED()
  }
}

function isSuppressionEnabled () {
  return suppressionEnabled
}

module.exports = {
  start, stop,
  setEnabled, isEnabled,
  startRecording, stopRecording,
  getStatus,
  setSuppression, isSuppressionEnabled,
  turnOffCapsLockLED
}
