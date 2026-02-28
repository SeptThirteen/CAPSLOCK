const { Tray, Menu, nativeImage, app } = require('electron')
const path = require('path')

let tray = null
let _mainWindow = null
let _lang = 'zh'

// Tray menu labels in both supported languages
const LABELS = {
  zh: {
    tooltip:  'CAPSLOCK - 按键重映射',
    showHide: '显示 / 隐藏',
    disable:  '禁用映射',
    enable:   '启用映射',
    quit:     '退出'
  },
  en: {
    tooltip:  'CAPSLOCK - Key Remapper',
    showHide: 'Show / Hide',
    disable:  'Disable Remapping',
    enable:   'Enable Remapping',
    quit:     'Quit'
  }
}

function setupTray (mainWindow) {
  _mainWindow = mainWindow

  const iconPath = path.join(__dirname, '../../assets/tray-icon.ico')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) icon = nativeImage.createEmpty()
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip(LABELS[_lang].tooltip)
  updateContextMenu()

  tray.on('click', () => toggleWindow())

  return tray
}

function toggleWindow () {
  if (!_mainWindow) return
  if (_mainWindow.isVisible()) {
    _mainWindow.hide()
  } else {
    _mainWindow.show()
    _mainWindow.focus()
  }
}

function setTrayLang (lang) {
  if (!LABELS[lang]) return
  _lang = lang
  if (tray) tray.setToolTip(LABELS[_lang].tooltip)
  updateContextMenu()
}

function updateContextMenu () {
  if (!tray) return
  const hook = require('./hook')
  const enabled = hook.isEnabled()
  const L = LABELS[_lang]

  const menu = Menu.buildFromTemplate([
    { label: 'CAPSLOCK', enabled: false },
    { type: 'separator' },
    {
      label: L.showHide,
      click: () => toggleWindow()
    },
    {
      label: enabled ? L.disable : L.enable,
      click: () => {
        const { IPC } = require('../shared/constants')
        hook.setEnabled(!enabled)
        updateContextMenu()
        if (_mainWindow && !_mainWindow.isDestroyed()) {
          _mainWindow.webContents.send(IPC.HOOK_STATUS_CHANGED, hook.getStatus())
        }
      }
    },
    { type: 'separator' },
    {
      label: L.quit,
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menu)
}

module.exports = { setupTray, updateContextMenu, setTrayLang }
