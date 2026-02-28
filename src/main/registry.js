// registry.js — Manages the Windows Scancode Map registry entry that remaps
// the physical Caps Lock key to F13 at the driver/OS level.
//
// Why F13? It has no function on modern keyboards, so it won't conflict with
// any application. The CAPSLOCK app then intercepts F13 instead of CapsLock.
//
// Registry key: HKLM\SYSTEM\CurrentControlSet\Control\Keyboard Layout
// Value name  : Scancode Map
//
// Requires: administrator privileges (enforced by requestedExecutionLevel in
// electron-builder.config.js).
//
// After writing the registry value a system RESTART is required for the
// driver to read the new mapping.

const { execSync } = require('child_process')

// Scancode for Caps Lock: 0x003A
// Scancode for F13:       0x0064
// The map below says: "when the keyboard generates 0x3A, send 0x64 instead"
//
// Scancode Map binary format (little-endian):
//   Header:  00 00 00 00  00 00 00 00   (version + flags)
//   Count:   02 00 00 00                (2 entries: 1 mapping + null terminator)
//   Entry:   64 00 3A 00                (F13=0x0064 ← CapsLock=0x003A)
//   Null:    00 00 00 00                (terminator)
const SCANCODE_MAP_HEX =
  '00000000' +  // header version
  '00000000' +  // header flags
  '02000000' +  // 2 entries (1 real + null)
  '64003A00' +  // F13 (0x0064) ← CapsLock (0x003A)
  '00000000'    // null terminator

const REG_KEY  = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Keyboard Layout'
const REG_NAME = '"Scancode Map"'

// Read current Scancode Map value as hex string, or null if absent
function readScancodeMap () {
  try {
    const out = execSync(
      `reg query "${REG_KEY}" /v "Scancode Map"`,
      { encoding: 'utf8', windowsHide: true }
    )
    // Output looks like:  "Scancode Map    REG_BINARY    <hex>"
    const match = out.match(/REG_BINARY\s+([0-9a-fA-F]+)/)
    return match ? match[1].toLowerCase() : null
  } catch {
    return null
  }
}

// Returns true when our F13 scancode map is currently active in the registry
function isRemapped () {
  const current = readScancodeMap()
  return current === SCANCODE_MAP_HEX.toLowerCase()
}

// Write the scancode map.  Returns { ok, needsRestart, error? }.
function applyRemap () {
  try {
    // Build "hex:xx,xx,…" format for reg.exe
    const hexPairs = SCANCODE_MAP_HEX
      .match(/../g)
      .join(',')

    execSync(
      `reg add "${REG_KEY}" /v "Scancode Map" /t REG_BINARY /d "${hexPairs}" /f`,
      { encoding: 'utf8', windowsHide: true }
    )
    return { ok: true, needsRestart: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// Remove the scancode map (restores normal Caps Lock behaviour after restart)
function removeRemap () {
  try {
    execSync(
      `reg delete "${REG_KEY}" /v "Scancode Map" /f`,
      { encoding: 'utf8', windowsHide: true }
    )
    return { ok: true, needsRestart: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

module.exports = { isRemapped, applyRemap, removeRemap }
