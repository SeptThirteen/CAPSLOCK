import { renderProfileList } from './components/ProfileList.js'
import { createProfileEditor } from './components/ProfileEditor.js'
import { t, getLang, setLang } from './i18n.js'

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  config: null,         // { version, enabled, macroSpeedMs, profiles }
  selectedId: null,     // currently selected profile id
  activeApp: { processName: '', windowTitle: '' },
  hookStatus: { enabled: true, running: true }
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
const $emptyState     = document.getElementById('empty-state')
const $profileEditor  = document.getElementById('profile-editor')
const $langBtn        = document.getElementById('lang-btn')
const $themeBtn       = document.getElementById('theme-btn')

// ── Banner refs ───────────────────────────────────────────────────────────────

const $bannerCompat  = document.getElementById('banner-compat')
const $bannerBtn     = document.getElementById('banner-btn')
const $bannerDismiss = document.getElementById('banner-dismiss')

// ── i18n ──────────────────────────────────────────────────────────────────────

function applyI18n () {
  // Update all static elements tagged with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n)
  })
  // Update lang button label (shows the OTHER language to switch to)
  $langBtn.textContent = getLang() === 'zh' ? 'EN' : '中文'
  // Re-sync toggle label since it depends on translation
  syncToggleUI()
  // Re-render sidebar (profile list unchanged but labels may update)
  if (state.config) refreshSidebar()
  // Re-render open editor so all strings inside components update
  if (state.selectedId) openProfileEditor(state.selectedId)
  // Sync tray menu language in main process
  window.capslock.setLang(getLang())
  // Update theme button title for new language
  applyTheme()
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

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init () {
  state.config = await window.capslock.getProfiles()
  state.hookStatus = await window.capslock.getHookStatus()

  // Apply initial translations
  applyI18n()
  applyTheme()

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
  window.capslock.onProfilesChanged(newConfig => {
    state.config = newConfig
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
  renderProfileList($profileList, state.config.profiles, state.selectedId, {
    onSelect: selectProfile
  })
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

  state.selectedId = updatedProfile.id
  refreshSidebar()
  openProfileEditor(updatedProfile.id)
}

function deleteProfile (id) {
  state.config.profiles = state.config.profiles.filter(p => p.id !== id)
  window.capslock.saveProfiles(state.config)

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

$addProfileBtn.addEventListener('click', () => {
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
