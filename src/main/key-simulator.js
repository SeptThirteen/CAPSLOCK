// key-simulator.js — simulates keystrokes via Win32 SendInput through koffi.

const { exec } = require('child_process')
const path = require('path')

let SendInput = null

try {
  const koffi = require('koffi')
  const user32 = koffi.load('user32.dll')
  SendInput = user32.func('uint32 SendInput(uint32 nInputs, uint8 *pInputs, int cbSize)')
} catch (e) {
  console.warn('[key-simulator] koffi unavailable, key simulation disabled:', e.message)
}

// Windows Virtual Key codes
const VK = {
  // Control keys
  backspace: 0x08, tab: 0x09, enter: 0x0D, return: 0x0D,
  escape: 0x1B, esc: 0x1B, space: 0x20,
  pageup: 0x21, pagedown: 0x22, end: 0x23, home: 0x24,
  left: 0x25, up: 0x26, right: 0x27, down: 0x28,
  insert: 0x2D, delete: 0x2E, del: 0x2E,

  // Top-row digits
  0: 0x30, 1: 0x31, 2: 0x32, 3: 0x33, 4: 0x34,
  5: 0x35, 6: 0x36, 7: 0x37, 8: 0x38, 9: 0x39,

  // Letters (VK is just uppercase ASCII)
  a: 0x41, b: 0x42, c: 0x43, d: 0x44, e: 0x45, f: 0x46, g: 0x47,
  h: 0x48, i: 0x49, j: 0x4A, k: 0x4B, l: 0x4C, m: 0x4D, n: 0x4E,
  o: 0x4F, p: 0x50, q: 0x51, r: 0x52, s: 0x53, t: 0x54, u: 0x55,
  v: 0x56, w: 0x57, x: 0x58, y: 0x59, z: 0x5A,

  // Windows key
  win: 0x5B, lwin: 0x5B, rwin: 0x5C, meta: 0x5B, super: 0x5B,

  // Numpad
  num0: 0x60, num1: 0x61, num2: 0x62, num3: 0x63, num4: 0x64,
  num5: 0x65, num6: 0x66, num7: 0x67, num8: 0x68, num9: 0x69,
  nummultiply: 0x6A, numadd: 0x6B, numsubtract: 0x6D,
  numdecimal: 0x6E, numdivide: 0x6F, numenter: 0x0D,

  // Function keys F1-F12
  f1: 0x70, f2: 0x71, f3: 0x72, f4: 0x73,
  f5: 0x74, f6: 0x75, f7: 0x76, f8: 0x77,
  f9: 0x78, f10: 0x79, f11: 0x7A, f12: 0x7B,

  // Extended Function keys F13-F24
  f13: 0x7C, f14: 0x7D, f15: 0x7E, f16: 0x7F,
  f17: 0x80, f18: 0x81, f19: 0x82, f20: 0x83,
  f21: 0x84, f22: 0x85, f23: 0x86, f24: 0x87,

  // Lock keys
  capslock: 0x14, numlock: 0x90, scrolllock: 0x91,

  // Modifier keys (left variants)
  shift: 0xA0, lshift: 0xA0, leftshift: 0xA0,
  rshift: 0xA1, rightshift: 0xA1,
  ctrl: 0xA2, control: 0xA2, lctrl: 0xA2, leftctrl: 0xA2,
  rctrl: 0xA3, rightctrl: 0xA3,
  alt: 0xA4, lalt: 0xA4, leftalt: 0xA4,
  ralt: 0xA5, rightalt: 0xA5,

  // Media keys
  volumemute: 0xAD, volumedown: 0xAE, volumeup: 0xAF,
  medianexttrack: 0xB0, mediaprevtrack: 0xB1,
  mediastop: 0xB2, mediaplaypause: 0xB3,
  
  // Browser keys
  browserback: 0xA6, browserforward: 0xA7, browserrefresh: 0xA8,
  browserstop: 0xA9, browsersearch: 0xAA, browserfavorites: 0xAB,
  browserhome: 0xAC,

  // App launch keys
  launchmail: 0xB4, launchmediaselect: 0xB5,
  launchapp1: 0xB6, launchapp2: 0xB7,

  // Special keys
  printscreen: 0x2C, prtsc: 0x2C, snapshot: 0x2C,
  pause: 0x13, break: 0x13,
  apps: 0x5D, menu: 0x5D, contextmenu: 0x5D,
  sleep: 0x5F,

  // OEM / punctuation (US layout)
  ';': 0xBA, ':': 0xBA, semicolon: 0xBA,
  '=': 0xBB, '+': 0xBB, equal: 0xBB, plus: 0xBB,
  ',': 0xBC, '<': 0xBC, comma: 0xBC,
  '-': 0xBD, '_': 0xBD, minus: 0xBD,
  '.': 0xBE, '>': 0xBE, period: 0xBE,
  '/': 0xBF, '?': 0xBF, slash: 0xBF,
  '`': 0xC0, '~': 0xC0, backquote: 0xC0, grave: 0xC0,
  '[': 0xDB, '{': 0xDB, openbracket: 0xDB,
  '\\': 0xDC, '|': 0xDC, backslash: 0xDC,
  ']': 0xDD, '}': 0xDD, closebracket: 0xDD,
  "'": 0xDE, '"': 0xDE, quote: 0xDE
}

// Keys that require the KEYEVENTF_EXTENDEDKEY flag on extended keyboards
const EXTENDED_VK = new Set([
  0x21, 0x22, 0x23, 0x24,       // PageUp, PageDown, End, Home
  0x25, 0x26, 0x27, 0x28,       // Arrow keys
  0x2D, 0x2E,                   // Insert, Delete
  0xA3, 0xA5, 0x5C,             // RCtrl, RAlt, RWin
  0x5D,                         // Apps/Menu key
  // Media keys
  0xAD, 0xAE, 0xAF, 0xB0, 0xB1, 0xB2, 0xB3,
  // Browser keys
  0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC,
  // Launch keys
  0xB4, 0xB5, 0xB6, 0xB7
])

// INPUT struct constants
const INPUT_KEYBOARD        = 1
const KEYEVENTF_KEYUP       = 0x0002
const KEYEVENTF_UNICODE     = 0x0004
const KEYEVENTF_EXTENDEDKEY = 0x0001
const INPUT_SIZE            = 40    // sizeof(INPUT) on x64 Windows

let autoDelayMs = 10

// Build a 40-byte INPUT buffer for a virtual key event
function makeVkInput (vkCode, isUp) {
  const extended = EXTENDED_VK.has(vkCode) ? KEYEVENTF_EXTENDEDKEY : 0
  const flags = extended | (isUp ? KEYEVENTF_KEYUP : 0)
  const buf = Buffer.alloc(INPUT_SIZE, 0)
  buf.writeUInt32LE(INPUT_KEYBOARD, 0)   // type
  buf.writeUInt16LE(vkCode, 8)           // wVk
  buf.writeUInt32LE(flags, 12)           // dwFlags
  return buf
}

// Build a 40-byte INPUT buffer for a Unicode character event
function makeUnicodeInput (charCode, isUp) {
  const flags = KEYEVENTF_UNICODE | (isUp ? KEYEVENTF_KEYUP : 0)
  const buf = Buffer.alloc(INPUT_SIZE, 0)
  buf.writeUInt32LE(INPUT_KEYBOARD, 0)
  buf.writeUInt16LE(0, 8)                // wVk = 0 (unused for unicode)
  buf.writeUInt16LE(charCode, 10)        // wScan = unicode code point
  buf.writeUInt32LE(flags, 12)
  return buf
}

function sendVk (vkCode, isDown) {
  if (!SendInput) return
  const input = makeVkInput(vkCode, !isDown)
  SendInput(1, input, INPUT_SIZE)
}

function resolveVk (keyStr) {
  const k = String(keyStr).trim().toLowerCase()
  const vk = VK[k]
  if (vk === undefined) {
    console.warn('[key-simulator] Unknown key:', keyStr)
    return null
  }
  return vk
}

/**
 * Launch an application
 * @param {string} appPath - Path to executable or app name
 * @param {string} args - Command line arguments (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function launchApp (appPath, args = '') {
  return new Promise((resolve) => {
    try {
      // Handle special app names
      const specialApps = {
        'explorer': 'explorer.exe',
        'notepad': 'notepad.exe',
        'calc': 'calc.exe',
        'calculator': 'calc.exe',
        'cmd': 'cmd.exe',
        'terminal': 'wt.exe',
        'powershell': 'powershell.exe',
        'settings': 'ms-settings:',
        'control': 'control.exe'
      }
      
      let command = specialApps[appPath.toLowerCase()] || appPath
      
      // If it's a URL-like string (ms-settings:, http://, etc.), use start
      if (command.includes(':')) {
        command = `start "" "${command}"`
      } else if (args) {
        command = `"${command}" ${args}`
      } else {
        command = `start "" "${command}"`
      }
      
      exec(command, { windowsHide: true }, (error) => {
        if (error) {
          console.error('[key-simulator] Failed to launch app:', error.message)
          resolve({ success: false, error: error.message })
        } else {
          resolve({ success: true })
        }
      })
    } catch (e) {
      console.error('[key-simulator] launchApp exception:', e.message)
      resolve({ success: false, error: e.message })
    }
  })
}

async function simulateMapping (mapping) {
  if (!SendInput && mapping.type !== 'macro') return

  try {
    switch (mapping.type) {
      case 'key': {
        const vk = resolveVk(mapping.key)
        if (vk !== null) {
          sendVk(vk, true)
          sendVk(vk, false)
        }
        break
      }

      case 'combo': {
        const vks = mapping.keys.map(resolveVk).filter(v => v !== null)
        if (vks.length === 0) break
        for (const vk of vks) sendVk(vk, true)
        for (const vk of [...vks].reverse()) sendVk(vk, false)
        break
      }

      case 'macro': {
        for (const step of mapping.sequence) {
          if (step.type === 'keydown') {
            const vk = resolveVk(step.key)
            if (vk !== null) sendVk(vk, true)
            if (autoDelayMs > 0) await sleep(autoDelayMs)

          } else if (step.type === 'keyup') {
            const vk = resolveVk(step.key)
            if (vk !== null) sendVk(vk, false)
            if (autoDelayMs > 0) await sleep(autoDelayMs)

          } else if (step.type === 'type') {
            await typeText(step.text || '')

          } else if (step.type === 'delay') {
            await sleep(step.ms || 0)
            
          } else if (step.type === 'launch') {
            // Launch application
            await launchApp(step.path || '', step.args || '')
            if (autoDelayMs > 0) await sleep(autoDelayMs)
          }
        }
        break
      }

      case 'disable':
        break

      default:
        console.warn('[key-simulator] Unknown mapping type:', mapping.type)
    }
  } catch (e) {
    console.error('[key-simulator] Simulation error:', e.message)
  }
}

// Type a string character-by-character using Unicode input events
async function typeText (text) {
  if (!SendInput) return
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    const down = makeUnicodeInput(code, false)
    const up   = makeUnicodeInput(code, true)
    const combined = Buffer.concat([down, up])
    SendInput(2, combined, INPUT_SIZE)
    if (autoDelayMs > 0) await sleep(autoDelayMs)
  }
}

function setAutoDelay (ms) {
  autoDelayMs = Math.max(0, ms)
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Export VK map for documentation/debugging
function getVkMap () {
  return { ...VK }
}

module.exports = { simulateMapping, setAutoDelay, launchApp, getVkMap }
