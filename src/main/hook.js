// hook.js — Keyboard hook using uiohook-napi (N-API, no rebuild needed)
//
// Two modes depending on whether the OS-level scancode map is applied:
//   - NORMAL mode  : watches for UiohookKey.CapsLock (no OS-level suppression;
//                    Caps Lock LED will still toggle until you apply the remap)
//   - REMAPPED mode: watches for UiohookKey.F13 (Caps Lock → F13 at driver level
//                    via registry scancode map; full suppression, no LED toggle)

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
const registry = require('./registry')

let enabled    = true
let recording  = false
let mainWindow = null
let targetKeycode = null  // set in start()

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

function start (win) {
  if (!uIOhook || !UiohookKey) {
    console.warn('[hook] uiohook-napi not loaded — keyboard hook disabled')
    return
  }

  mainWindow = win

  const remapped = registry.isRemapped()
  targetKeycode  = remapped ? UiohookKey.F13 : UiohookKey.CapsLock

  console.log(
    `[hook] mode=${remapped ? 'REMAPPED(F13)' : 'DIRECT(CapsLock)'}  ` +
    `keycode=0x${targetKeycode.toString(16)}`
  )

  if (!remapped) normalizeCapsLockState()

  uIOhook.on('keydown', handleKeydown)
  uIOhook.on('keyup',   handleKeyup)
  uIOhook.start()
}

function handleKeydown (event) {
  if (event.keycode === targetKeycode) {
    if (!enabled) return
    if (recording) return  // don't trigger action while recording a different key

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
function getStatus ()      { return { enabled, running: true } }

// Force Caps Lock OFF on startup (only needed in DIRECT/non-remapped mode).
// If the registry scancode map is active, CapsLock can never reach the OS
// so there is nothing to clear.
function normalizeCapsLockState () {
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
      keybd_event(VK_CAPITAL, 0x3A, KEYEVENTF_KEYDOWN, 0)
      keybd_event(VK_CAPITAL, 0x3A, KEYEVENTF_KEYUP,   0)
    }
  } catch { /* koffi not available — non-fatal */ }
}

module.exports = {
  start, stop,
  setEnabled, isEnabled,
  startRecording, stopRecording,
  getStatus
}
