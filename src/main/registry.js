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

const { spawnSync } = require('child_process')

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

function decodeWindowsOutput (buf) {
  if (!buf || buf.length === 0) return ''

  const utf8 = buf.toString('utf8').trim()
  if (utf8 && !utf8.includes('�')) return utf8

  try {
    const gbk = new TextDecoder('gbk').decode(buf).trim()
    if (gbk) return gbk
  } catch {
    // Fallback to utf8 if gbk decoder is unavailable
  }

  return utf8
}

function runReg (args) {
  const result = spawnSync('reg', args, {
    windowsHide: true,
    encoding: 'buffer'
  })

  return {
    status: result.status ?? -1,
    stdout: decodeWindowsOutput(result.stdout),
    stderr: decodeWindowsOutput(result.stderr)
  }
}

function mapRegistryError (action, regResult) {
  const detail = (regResult.stderr || regResult.stdout || '').replace(/\s+/g, ' ').trim()
  if (/access is denied|拒绝访问/i.test(detail)) {
    return 'Access denied. Please run CAPSLOCK as Administrator and retry.'
  }
  if (detail) return detail
  return `Failed to ${action} Scancode Map (exit code ${regResult.status}).`
}

// Read current Scancode Map value as hex string, or null if absent
function readScancodeMap () {
  const result = runReg(['query', REG_KEY, '/v', 'Scancode Map'])
  if (result.status !== 0) return null

  // Output looks like: "Scancode Map    REG_BINARY    <hex>"
  const match = result.stdout.match(/REG_BINARY\s+([0-9a-fA-F]+)/)
  return match ? match[1].toLowerCase() : null
}

// Returns true when our F13 scancode map is currently active in the registry
function isRemapped () {
  const current = readScancodeMap()
  return current === SCANCODE_MAP_HEX.toLowerCase()
}

// Write the scancode map.  Returns { ok, needsRestart, error? }.
function applyRemap () {
  // Build "xx,xx,..." format for reg.exe
  const hexPairs = SCANCODE_MAP_HEX
    .match(/../g)
    .join(',')

  const result = runReg([
    'add',
    REG_KEY,
    '/v',
    'Scancode Map',
    '/t',
    'REG_BINARY',
    '/d',
    hexPairs,
    '/f'
  ])

  if (result.status === 0) {
    return { ok: true, needsRestart: true }
  }

  return { ok: false, error: mapRegistryError('apply', result) }
}

// Remove the scancode map (restores normal Caps Lock behaviour after restart)
function removeRemap () {
  const result = runReg(['delete', REG_KEY, '/v', 'Scancode Map', '/f'])
  if (result.status === 0) {
    return { ok: true, needsRestart: true }
  }
  return { ok: false, error: mapRegistryError('remove', result) }
}

module.exports = { isRemapped, applyRemap, removeRemap }
