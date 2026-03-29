// ProfileList — renders the left sidebar profile list
// Exports: init(el, profiles, selectedId, callbacks)

import { t } from '../i18n.js'

export function renderProfileList (el, profiles, selectedId, callbacks, options = {}) {
  const { conflicts = [], searchTerm = '' } = options
  const conflictIds = new Set(conflicts.flatMap(c => c.profiles || []))
  
  el.innerHTML = ''
  
  // Filter profiles based on search term
  let filteredProfiles = profiles
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filteredProfiles = profiles.filter(p => {
      const nameMatch = (p.name || '').toLowerCase().includes(term)
      const processMatch = (p.matcher?.processName || '').toLowerCase().includes(term)
      const titleMatch = (p.matcher?.windowTitle || '').toLowerCase().includes(term)
      return nameMatch || processMatch || titleMatch
    })
  }
  
  filteredProfiles.forEach(p => {
    const item = document.createElement('div')
    const hasConflict = conflictIds.has(p.id)
    item.className = 'profile-item' + 
      (p.id === selectedId ? ' active' : '') +
      (hasConflict ? ' has-conflict' : '')
    item.dataset.id = p.id
    item.innerHTML = `
      <span class="dot"></span>
      <span class="name">${esc(p.name || t('profile.unnamed'))}</span>
    `
    if (hasConflict) {
      item.title = t('validation.duplicateProcess')
    }
    item.addEventListener('click', () => callbacks.onSelect(p.id))
    el.appendChild(item)
  })
  
  return { filtered: filteredProfiles.length, total: profiles.length }
}

function esc (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
