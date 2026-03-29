import { renderProfileList } from './components/ProfileList.js'
import { createProfileEditor } from './components/ProfileEditor.js'
import { t, getLang, setLang } from './i18n.js'

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  config: null,         // { version, enabled, macroSpeedMs, profiles }
  selectedId: null,     // currently selected profile id
  activeApp: { processName: '', windowTitle: '' },
  hookStatus: { enabled: true, running: true },
  searchTerm: '',       // current search filter
  conflicts: [],        // validation conflicts
  warnings: []          // validation warnings
}

let activeEditor = null // current ProfileEditor instance

// Active key-recording session
let _recordBtn = null
let _recordBtnOrigText = null
let _recordResultCb = null

// ── DOM refs ──────────────────────────────────────────────────────────────────

const $profileList    = document.getElementById('profile-list')
const $addProfileBtn  = document.getElementById('add-profile-btn')
const $activeAppEl    = document.getElementById('active-app-display')
const $enabledToggle  = document.getElementById('enabled-toggle')
const $statusLabel    = document.getElementById('status-label')
const $gameModeBtn    = document.getElementById('game-mode-btn')
const $emptyState     = document.getElementById('empty-state')
const $profileEditor  = document.getElementById('profile-editor')
const $langBtn        = document.getElementById('lang-btn')
const $themeBtn       = document.getElementById('theme-btn')

const SHORTCUT_GAME_MODE = 'Ctrl+Alt+G'

// Search refs
const $searchInput    = document.getElementById('search-input')
const $searchClear    = document.getElementById('search-clear')
const $noResults      = document.getElementById('no-results')

// Import/Export refs
const $exportBtn      = document.getElementById('export-btn')
const $importBtn      = document.getElementById('import-btn')

// ── Banner refs ───────────────────────────────────────────────────────────────

const $bannerCompat  = document.getElementById('banner-compat')
const $bannerBtn     = document.getElementById('banner-btn')
const $bannerDismiss = document.getElementById('banner-dismiss')

const $bannerValidation = document.getElementById('banner-validation')
const $validationText   = document.getElementById('validation-text')
const $validationDismiss = document.getElementById('validation-dismiss')

// ── i18n ──────────────────────────────────────────────────────────────────────

function applyI18n () {
  // Update all static elements tagged with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n)
  })
  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder)
  })
  // Update lang button label (shows the OTHER language to switch to)
  $langBtn.textContent = getLang() === 'zh' ? 'EN' : '中文'
  // Re-sync toggle label since it depends on translation
  syncToggleUI()
  syncGameModeUI()
  // Re-render sidebar (profile list unchanged but labels may update)
  if (state.config) refreshSidebar()
  // Re-render open editor so all strings inside components update
  if (state.selectedId) openProfileEditor(state.selectedId)
  // Sync tray menu language in main process
  window.capslock.setLang(getLang())
  // Update theme button title for new language
  applyTheme()
  // Update import/export button titles
  $exportBtn.title = t('importExport.exportBtn')
  $importBtn.title = t('importExport.importBtn')
}

window.addEventListener('langchange', applyI18n)

$langBtn.addEventListener('click', () => {
  setLang(getLang() === 'zh' ? 'en' : 'zh')
})

// ── Theme ────────────────────────────────────────────────────────────────────

function applyTheme () {
  const theme = localStorage.getItem('capslock:theme') || 'dark'
  document.documentElement.setAttribute('data-theme', theme)
  $themeBtn.textContent = theme === 'dark' ? '\u263D' : '\u2600'
  $themeBtn.title = theme === 'dark' ? t('header.themeDark') : t('header.themeLight')
}

$themeBtn.addEventListener('click', () => {
  const current = localStorage.getItem('capslock:theme') || 'dark'
  const next = current === 'dark' ? 'light' : 'dark'
  localStorage.setItem('capslock:theme', next)
  applyTheme()
})

$gameModeBtn.addEventListener('click', async () => {
  try {
    const result = await window.capslock.toggleGameMode()
    if (typeof result.enabled === 'boolean') {
      state.hookStatus.gameMode = result.enabled
      syncGameModeUI()
      showToast(result.enabled ? t('header.gameModeOn') : t('header.gameModeOff'))
    }
  } catch (e) {
    alert(t('profile.saveFailed') + e.message)
  }
})

// ── Search ───────────────────────────────────────────────────────────────────

$searchInput.addEventListener('input', (e) => {
  state.searchTerm = e.target.value
  $searchClear.style.display = state.searchTerm ? '' : 'none'
  refreshSidebar()
})

$searchClear.addEventListener('click', () => {
  state.searchTerm = ''
  $searchInput.value = ''
  $searchClear.style.display = 'none'
  refreshSidebar()
})

// ── Import/Export ────────────────────────────────────────────────────────────

$exportBtn.addEventListener('click', async () => {
  try {
    const result = await window.capslock.exportProfiles()
    if (result.success) {
      showToast(t('importExport.exportSuccess'))
    } else if (result.canceled) {
      // User canceled, do nothing
    } else {
      alert(t('importExport.exportError') + result.error)
    }
  } catch (e) {
    alert(t('importExport.exportError') + e.message)
  }
})

$importBtn.addEventListener('click', async () => {
  // Ask user whether to merge or replace
  const merge = confirm(
    getLang() === 'zh' 
      ? '选择导入模式：\n\n确定 = 合并到现有配置\n取消 = 替换所有配置' 
      : 'Choose import mode:\n\nOK = Merge with existing\nCancel = Replace all'
  )
  
  try {
    const result = await window.capslock.importProfiles({ merge })
    if (result.success) {
      if (merge && typeof result.skipped === 'number') {
        showToast(t('importExport.importMerged', { imported: result.imported, skipped: result.skipped }))
      } else {
        showToast(t('importExport.importSuccess', { count: result.imported }))
      }
      // Refresh config
      state.config = await window.capslock.getProfiles()
      await validateAndShowConflicts()
      refreshSidebar()
      if (state.config.profiles.length > 0) {
        selectProfile(state.config.profiles[0].id)
      }
    } else if (result.canceled) {
      // User canceled, do nothing
    } else {
      alert(t('importExport.importError') + result.error)
    }
  } catch (e) {
    alert(t('importExport.importError') + e.message)
  }
})

// ── Toast notification ───────────────────────────────────────────────────────

function showToast (message) {
  // Create toast element
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent);
    color: var(--bg);
    padding: 10px 20px;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 500;
    z-index: 9999;
    animation: fadeInOut 2s ease-in-out forwards;
  `
  document.body.appendChild(toast)
  
  // Remove after animation
  setTimeout(() => toast.remove(), 2000)
}

// Add toast animation to head
const toastStyle = document.createElement('style')
toastStyle.textContent = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
    15% { opacity: 1; transform: translateX(-50%) translateY(0); }
    85% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  }
`
document.head.appendChild(toastStyle)

// ── Validation ───────────────────────────────────────────────────────────────

async function validateAndShowConflicts () {
  try {
    const { conflicts, warnings } = await window.capslock.validateProfiles(state.config.profiles)
    state.conflicts = conflicts
    state.warnings = warnings
    
    // Show validation banner if there are conflicts
    if (conflicts.length > 0) {
      const lang = getLang()
      const messages = conflicts.map(c => lang === 'zh' ? c.messageZh : c.message)
      $validationText.textContent = '⚠ ' + messages.join(' | ')
      $bannerValidation.style.display = 'flex'
    } else {
      $bannerValidation.style.display = 'none'
    }
  } catch (e) {
    console.error('Validation failed:', e)
    state.conflicts = []
    state.warnings = []
  }
}

$validationDismiss.addEventListener('click', () => {
  $bannerValidation.style.display = 'none'
})

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init () {
  state.config = await window.capslock.getProfiles()
  state.hookStatus = await window.capslock.getHookStatus()

  // Apply initial translations
  applyI18n()
  applyTheme()

  // Validate profiles
  await validateAndShowConflicts()

  // Show suppression banner if Caps Lock is not remapped at the OS level
  const { remapped } = await window.capslock.getRegistryStatus()
  if (!remapped) $bannerCompat.style.display = 'flex'

  $bannerBtn.addEventListener('click', async () => {
    const result = await window.capslock.applyRegistry()
    if (result.ok) {
      document.getElementById('banner-text').textContent = t('banner.updated')
      $bannerBtn.style.display = 'none'
    } else {
      alert(t('banner.applyFailed') + result.error)
    }
  })

  $bannerDismiss.addEventListener('click', () => {
    $bannerCompat.style.display = 'none'
  })

  syncToggleUI()
  refreshSidebar()

  if (state.config.profiles.length > 0) {
    selectProfile(state.config.profiles[0].id)
  }

  // IPC event listeners
  window.capslock.onProfilesChanged(async newConfig => {
    state.config = newConfig
    await validateAndShowConflicts()
    refreshSidebar()
  })

  window.capslock.onActiveAppChanged(app => {
    state.activeApp = app
    $activeAppEl.textContent = app.processName || '—'
    $activeAppEl.title = app.windowTitle || ''
  })

  window.capslock.onHookStatusChanged(status => {
    state.hookStatus = status
    syncToggleUI()
    syncGameModeUI()
  })

  window.capslock.onProfileCycled(payload => {
    if (!payload || !payload.id) return
    state.selectedId = payload.id
    refreshSidebar()
    openProfileEditor(payload.id)
    showToast(t('shortcuts.profileCycled', { name: payload.name || t('profile.unnamed') }))
  })

  window.capslock.onGameModeChanged(({ enabled }) => {
    state.hookStatus.gameMode = !!enabled
    syncGameModeUI()
  })

  // Single registration for key recording results
  window.capslock.onKeyRecorded(data => {
    // Reset the record button that initiated this session
    if (_recordBtn) {
      _recordBtn.classList.remove('recording')
      _recordBtn.textContent = _recordBtnOrigText || t('mapping.recordKeyBtn')
      _recordBtn = null
      _recordBtnOrigText = null
    }
    // Deliver recorded key to the waiting callback
    if (_recordResultCb) {
      _recordResultCb(data)
      _recordResultCb = null
    }
  })
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function refreshSidebar () {
  const result = renderProfileList($profileList, state.config.profiles, state.selectedId, {
    onSelect: selectProfile
  }, {
    conflicts: state.conflicts,
    searchTerm: state.searchTerm
  })
  
  // Show/hide no results message
  if (state.searchTerm && result.filtered === 0) {
    $noResults.style.display = ''
    $profileList.style.display = 'none'
  } else {
    $noResults.style.display = 'none'
    $profileList.style.display = ''
  }
}

function selectProfile (id) {
  state.selectedId = id
  refreshSidebar()
  openProfileEditor(id)
}

// ── Profile editor ────────────────────────────────────────────────────────────

function openProfileEditor (id) {
  const profile = state.config.profiles.find(p => p.id === id)
  if (!profile) {
    $emptyState.style.display = ''
    $profileEditor.style.display = 'none'
    activeEditor = null
    return
  }

  $emptyState.style.display = 'none'
  $profileEditor.style.display = ''
  $profileEditor.innerHTML = ''

  const isDefault = profile.matcher === null

  activeEditor = createProfileEditor(profile, isDefault, {
    onSave:        (updated) => saveProfile(updated),
    onDelete:      (profileId) => deleteProfile(profileId),
    onRecordStart: (btn, onResult) => startKeyRecordSession(btn, onResult)
  })

  $profileEditor.appendChild(activeEditor.el)
}

// ── Save / Delete ─────────────────────────────────────────────────────────────

async function saveProfile (updatedProfile) {
  const idx = state.config.profiles.findIndex(p => p.id === updatedProfile.id)
  if (idx === -1) {
    state.config.profiles.push(updatedProfile)
  } else {
    state.config.profiles[idx] = updatedProfile
  }

  const result = await window.capslock.saveProfiles(state.config)
  if (!result.success) {
    alert(t('profile.saveFailed') + (result.error || 'Unknown error'))
    return
  }

  // Validate after save
  await validateAndShowConflicts()

  state.selectedId = updatedProfile.id
  refreshSidebar()
  openProfileEditor(updatedProfile.id)
}

async function deleteProfile (id) {
  state.config.profiles = state.config.profiles.filter(p => p.id !== id)
  await window.capslock.saveProfiles(state.config)

  // Validate after delete
  await validateAndShowConflicts()

  state.selectedId = state.config.profiles.length > 0
    ? state.config.profiles[0].id
    : null

  refreshSidebar()
  if (state.selectedId) {
    openProfileEditor(state.selectedId)
  } else {
    $emptyState.style.display = ''
    $profileEditor.style.display = 'none'
    activeEditor = null
  }
}

// ── Add profile ───────────────────────────────────────────────────────────────

$addProfileBtn.addEventListener('click', async () => {
  const newProfile = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    name: t('profile.newName'),
    matcher: {
      processName: '',
      processNameMatchType: 'exact',
      windowTitle: null,
      windowTitleMatchType: 'contains'
    },
    mapping: { type: 'key', key: 'escape' }
  }
  state.config.profiles.push(newProfile)
  state.selectedId = newProfile.id
  
  // Validate after add
  await validateAndShowConflicts()
  
  refreshSidebar()
  openProfileEditor(newProfile.id)
})

// ── Global enable/disable toggle ──────────────────────────────────────────────

$enabledToggle.addEventListener('change', () => {
  const enabled = $enabledToggle.checked
  window.capslock.toggleHook(enabled)
  state.hookStatus.enabled = enabled
  syncToggleUI()
})

function syncToggleUI () {
  const enabled = state.hookStatus.enabled
  $enabledToggle.checked = enabled
  $statusLabel.textContent = enabled ? t('header.enabled') : t('header.disabled')
  $statusLabel.style.color = enabled ? '' : 'var(--text-muted)'
}

function syncGameModeUI () {
  const gameModeEnabled = !!state.hookStatus.gameMode
  $gameModeBtn.classList.toggle('active', gameModeEnabled)
  $gameModeBtn.textContent = `GM ${gameModeEnabled ? t('header.gameOn') : t('header.gameOff')}`
  $gameModeBtn.title = `${t('header.gameMode')} (${SHORTCUT_GAME_MODE})`
}

// ── Key recording session ─────────────────────────────────────────────────────

function startKeyRecordSession (btn, onResult) {
  // Cancel any previous session that wasn't completed
  if (_recordBtn && _recordBtn !== btn) {
    _recordBtn.classList.remove('recording')
    _recordBtn.textContent = _recordBtnOrigText || t('mapping.recordKeyBtn')
    window.capslock.stopKeyRecord()
  }

  _recordBtn = btn
  _recordBtnOrigText = btn.textContent
  _recordResultCb = onResult

  btn.classList.add('recording')
  btn.textContent = t('recording.listening')
  window.capslock.startKeyRecord()
}

// ── Start ─────────────────────────────────────────────────────────────────────

init()
