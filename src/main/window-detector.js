const path = require('path')
const { IPC } = require('../shared/constants')

let GetForegroundWindow       = null
let GetWindowThreadProcessId  = null
let GetWindowTextW            = null
let OpenProcess               = null
let GetModuleFileNameExW      = null
let CloseHandle               = null

let pollTimer    = null
let mainWindow   = null
let initialized  = false
let cachedWindow = { processName: '', windowTitle: '' }

function initLibraries () {
  if (initialized) return true
  initialized = true

  try {
    const koffi = require('koffi')

    // Opaque handle types (HWND, HANDLE are pointer-sized opaque values on Windows)
    const HWND_T   = koffi.opaque('HWND')
    const HANDLE_T = koffi.opaque('HANDLE')
    const HWND_P   = koffi.pointer('HWND_P', HWND_T)
    const HANDLE_P = koffi.pointer('HANDLE_P', HANDLE_T)

    const user32   = koffi.load('user32.dll')
    const kernel32 = koffi.load('kernel32.dll')
    const psapi    = koffi.load('psapi.dll')

    GetForegroundWindow      = user32.func('HWND_P GetForegroundWindow()')
    GetWindowThreadProcessId = user32.func('uint32 GetWindowThreadProcessId(HWND_P hWnd, uint32 *lpdwProcessId)')
    GetWindowTextW           = user32.func('int GetWindowTextW(HWND_P hWnd, uint16 *lpString, int nMaxCount)')
    OpenProcess              = kernel32.func('HANDLE_P OpenProcess(uint32 dwDesiredAccess, int bInheritHandle, uint32 dwProcessId)')
    GetModuleFileNameExW     = psapi.func('uint32 GetModuleFileNameExW(HANDLE_P hProcess, HANDLE_P hModule, uint16 *lpFilename, uint32 nSize)')
    CloseHandle              = kernel32.func('int CloseHandle(HANDLE_P hObject)')

    return true
  } catch (e) {
    console.warn('[window-detector] koffi unavailable — per-app profiles disabled:', e.message)
    return false
  }
}

const PROCESS_QUERY_INFORMATION = 0x0400
const PROCESS_VM_READ           = 0x0010

function pollActiveWindow () {
  if (!GetForegroundWindow) return

  try {
    const hwnd = GetForegroundWindow()
    if (!hwnd) return

    // Get PID of foreground window
    const pidBuf = new Uint32Array(1)
    GetWindowThreadProcessId(hwnd, pidBuf)
    const pid = pidBuf[0]
    if (!pid) return

    // Open process handle
    const hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, pid)
    if (!hProcess) return

    // Get executable path (UTF-16)
    const nameBuf = new Uint16Array(260)
    GetModuleFileNameExW(hProcess, null, nameBuf, 260)
    CloseHandle(hProcess)

    // Get window title (UTF-16)
    const titleBuf = new Uint16Array(260)
    GetWindowTextW(hwnd, titleBuf, 260)

    const processName = path.basename(
      Buffer.from(nameBuf.buffer).toString('utf16le').replace(/\0[\s\S]*$/g, '')
    )
    const windowTitle = Buffer.from(titleBuf.buffer).toString('utf16le').replace(/\0[\s\S]*$/g, '')

    // Only broadcast if something changed
    if (processName !== cachedWindow.processName || windowTitle !== cachedWindow.windowTitle) {
      cachedWindow = { processName, windowTitle }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC.APP_ACTIVE, cachedWindow)
      }
    }
  } catch {
    // Ignore transient errors (e.g. process exited between OpenProcess and GetModuleFileNameExW)
  }
}

function start (win, intervalMs = 150) {
  mainWindow = win
  if (!initLibraries()) return
  pollTimer = setInterval(pollActiveWindow, intervalMs)
}

function stop () {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function getCachedWindow () {
  return cachedWindow
}

module.exports = { start, stop, getCachedWindow }
