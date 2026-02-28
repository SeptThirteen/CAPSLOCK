// ProfileList — renders the left sidebar profile list
// Exports: init(el, profiles, selectedId, callbacks)

import { t } from '../i18n.js'

export function renderProfileList (el, profiles, selectedId, callbacks) {
  el.innerHTML = ''
  profiles.forEach(p => {
    const item = document.createElement('div')
    item.className = 'profile-item' + (p.id === selectedId ? ' active' : '')
    item.dataset.id = p.id
    item.innerHTML = `
      <span class="dot"></span>
      <span class="name">${esc(p.name || t('profile.unnamed'))}</span>
    `
    item.addEventListener('click', () => callbacks.onSelect(p.id))
    el.appendChild(item)
  })
}

function esc (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
