// ProfileEditor — renders the full profile settings panel
// Returns: { el, getDraft }

import { createMappingEditor } from './MappingEditor.js'
import { t } from '../i18n.js'

export function createProfileEditor (profile, isDefault, callbacks) {
  // Work on a deep copy so we don't mutate caller's state
  const draft = JSON.parse(JSON.stringify(profile))

  const el = document.createElement('div')

  let mappingEditor = null
  let activeRecordCallback = null

  function render () {
    el.innerHTML = ''

    // ── Profile name ──────────────────────────────────────────────
    const nameSection = document.createElement('div')
    nameSection.className = 'section'
    nameSection.innerHTML = `
      <div class="section-title">${t('profile.sectionTitle')}</div>
      <div class="field">
        <label>${t('profile.nameLabel')}</label>
        <input type="text" id="pname-input" value="${esc(draft.name || '')}" placeholder="${t('profile.namePlaceholder')}" autocomplete="off">
      </div>
    `
    nameSection.querySelector('#pname-input').addEventListener('input', e => {
      draft.name = e.target.value
    })
    el.appendChild(nameSection)

    // ── App matcher (only for non-default profiles) ───────────────
    if (!isDefault) {
      const matcher = draft.matcher || {}
      const matcherSection = document.createElement('div')
      matcherSection.className = 'section'
      matcherSection.innerHTML = `
        <div class="section-title">${t('profile.matcherTitle')}</div>
        <p class="notice" style="margin-bottom:10px;">
          ${t('profile.matcherNotice').replace('\n', '<br>')}
        </p>
        <div class="field">
          <label>${t('profile.processLabel')}</label>
          <input type="text" id="proc-input" value="${esc(matcher.processName || '')}"
            placeholder="${t('profile.processPlaceholder')}" autocomplete="off" spellcheck="false">
          <select id="proc-match">
            <option value="exact"    ${matcher.processNameMatchType === 'exact'    ? 'selected' : ''}>${t('profile.matchExact')}</option>
            <option value="contains" ${matcher.processNameMatchType === 'contains' ? 'selected' : ''}>${t('profile.matchContains')}</option>
            <option value="regex"    ${matcher.processNameMatchType === 'regex'    ? 'selected' : ''}>${t('profile.matchRegex')}</option>
          </select>
        </div>
        <div class="field">
          <label>${t('profile.titleLabel')}</label>
          <input type="text" id="title-input" value="${esc(matcher.windowTitle || '')}"
            placeholder="${t('profile.titlePlaceholder')}" autocomplete="off" spellcheck="false">
          <select id="title-match">
            <option value="contains" ${matcher.windowTitleMatchType !== 'regex' ? 'selected' : ''}>${t('profile.matchContains')}</option>
            <option value="regex"    ${matcher.windowTitleMatchType === 'regex' ? 'selected' : ''}>${t('profile.matchRegex')}</option>
          </select>
        </div>
      `
      matcherSection.querySelector('#proc-input').addEventListener('input', e => {
        if (!draft.matcher) draft.matcher = {}
        draft.matcher.processName = e.target.value
      })
      matcherSection.querySelector('#proc-match').addEventListener('change', e => {
        if (!draft.matcher) draft.matcher = {}
        draft.matcher.processNameMatchType = e.target.value
      })
      matcherSection.querySelector('#title-input').addEventListener('input', e => {
        if (!draft.matcher) draft.matcher = {}
        draft.matcher.windowTitle = e.target.value || null
      })
      matcherSection.querySelector('#title-match').addEventListener('change', e => {
        if (!draft.matcher) draft.matcher = {}
        draft.matcher.windowTitleMatchType = e.target.value
      })
      el.appendChild(matcherSection)
    }

    // ── Mapping editor ────────────────────────────────────────────
    mappingEditor = createMappingEditor(draft.mapping, handleRecordRequest)
    el.appendChild(mappingEditor.el)

    // ── Footer buttons ────────────────────────────────────────────
    const footer = document.createElement('div')
    footer.className = 'editor-footer'
    if (!isDefault) {
      const delBtn = document.createElement('button')
      delBtn.className = 'btn btn-danger'
      delBtn.textContent = t('profile.deleteBtn')
      delBtn.addEventListener('click', () => {
        if (confirm(t('profile.deleteConfirm').replace('{name}', draft.name))) {
          callbacks.onDelete(draft.id)
        }
      })
      footer.appendChild(delBtn)
    }
    const spacer = document.createElement('span')
    spacer.style.flex = '1'
    footer.appendChild(spacer)

    const saveBtn = document.createElement('button')
    saveBtn.className = 'btn btn-accent'
    saveBtn.textContent = t('profile.saveBtn')
    saveBtn.addEventListener('click', () => {
      draft.mapping = mappingEditor.getMapping()
      callbacks.onSave(JSON.parse(JSON.stringify(draft)))
    })
    footer.appendChild(saveBtn)
    el.appendChild(footer)
  }

  function handleRecordRequest (mappingType, btn, done) {
    // Store callback so the recorder can deliver the result
    activeRecordCallback = (data) => {
      done(data)
      activeRecordCallback = null
    }
    callbacks.onRecordStart(btn, (data) => {
      if (activeRecordCallback) activeRecordCallback(data)
    })
  }

  render()

  return {
    el,
    getDraft: () => {
      if (mappingEditor) draft.mapping = mappingEditor.getMapping()
      return JSON.parse(JSON.stringify(draft))
    },
    receiveKeyRecorded: (data) => {
      if (activeRecordCallback) activeRecordCallback(data)
    }
  }
}

function esc (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
