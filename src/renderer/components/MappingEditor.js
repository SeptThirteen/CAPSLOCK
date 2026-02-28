// MappingEditor — renders the mapping section (key / combo / macro)
// Returns: { el, getMapping }

import { t } from '../i18n.js'

export function createMappingEditor (initialMapping, onRecordRequest) {
  const mapping = deepCopy(initialMapping) || { type: 'key', key: 'escape' }

  const el = document.createElement('div')
  el.className = 'section'

  function render () {
    el.innerHTML = `
      <div class="section-title">${t('mapping.sectionTitle')}</div>
      <div class="radio-group" id="type-radios">
        <button class="radio-btn ${mapping.type === 'key' ? 'selected' : ''}" data-type="key">${t('mapping.typeKey')}</button>
        <button class="radio-btn ${mapping.type === 'combo' ? 'selected' : ''}" data-type="combo">${t('mapping.typeCombo')}</button>
        <button class="radio-btn ${mapping.type === 'macro' ? 'selected' : ''}" data-type="macro">${t('mapping.typeMacro')}</button>
        <button class="radio-btn ${mapping.type === 'disable' ? 'selected' : ''}" data-type="disable">${t('mapping.typeDisable')}</button>
      </div>
      <div id="mapping-body"></div>
    `
    el.querySelectorAll('.radio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type
        if (type === mapping.type) return
        mapping.type = type
        if (type === 'key') Object.assign(mapping, { key: 'escape' })
        else if (type === 'combo') Object.assign(mapping, { keys: [] })
        else if (type === 'macro') Object.assign(mapping, { sequence: [] })
        else if (type === 'disable') { delete mapping.key; delete mapping.keys; delete mapping.sequence }
        render()
      })
    })

    renderBody()
  }

  function renderBody () {
    const body = el.querySelector('#mapping-body')
    if (mapping.type === 'key') renderKeyEditor(body)
    else if (mapping.type === 'combo') renderComboEditor(body)
    else if (mapping.type === 'macro') renderMacroEditor(body)
    else if (mapping.type === 'disable') renderDisableEditor(body)
  }

  function renderKeyEditor (body) {
    const key = mapping.key || ''
    body.innerHTML = `
      <div class="field">
        <label>${t('mapping.keyLabel')}</label>
        <input type="text" id="key-input" value="${esc(key)}" placeholder="${t('mapping.keyPlaceholder')}" autocomplete="off" spellcheck="false">
        <button class="btn btn-record" id="record-key-btn">${t('mapping.recordKeyBtn')}</button>
        <button class="btn" id="clear-key-btn">${t('mapping.clearBtn')}</button>
      </div>
      <p class="notice">${t('mapping.keyNotice')}</p>
    `
    body.querySelector('#key-input').addEventListener('input', e => {
      mapping.key = e.target.value.trim().toLowerCase()
    })
    body.querySelector('#clear-key-btn').addEventListener('click', () => {
      mapping.key = ''
      body.querySelector('#key-input').value = ''
    })
    body.querySelector('#record-key-btn').addEventListener('click', e => {
      onRecordRequest('key', e.target, (data) => {
        mapping.key = data.key || ''
        body.querySelector('#key-input').value = mapping.key
      })
    })
  }

  function renderComboEditor (body) {
    if (!Array.isArray(mapping.keys)) mapping.keys = []
    body.innerHTML = `
      <div class="key-tags" id="combo-tags"></div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button class="btn btn-record" id="record-combo-btn">${t('mapping.recordComboBtn')}</button>
        <button class="btn" id="clear-combo-btn">${t('mapping.clearAllBtn')}</button>
      </div>
      <p class="notice">${t('mapping.comboNotice')}</p>
    `
    renderComboTags(body)

    body.querySelector('#record-combo-btn').addEventListener('click', e => {
      onRecordRequest('combo', e.target, (data) => {
        const parts = []
        if (data.modifiers.ctrl) parts.push('ctrl')
        if (data.modifiers.alt) parts.push('alt')
        if (data.modifiers.shift) parts.push('shift')
        if (data.modifiers.meta) parts.push('win')
        if (data.key && !['ctrl', 'shift', 'alt', 'win'].includes(data.key)) {
          parts.push(data.key)
        }
        mapping.keys = parts
        renderComboTags(body)
      })
    })
    body.querySelector('#clear-combo-btn').addEventListener('click', () => {
      mapping.keys = []
      renderComboTags(body)
    })
  }

  function renderComboTags (body) {
    const container = body.querySelector('#combo-tags')
    if (!container) return
    if (mapping.keys.length === 0) {
      container.innerHTML = `<span style="color:var(--text-muted);font-size:12px;">${t('mapping.comboEmpty')}</span>`
      return
    }
    container.innerHTML = mapping.keys.map((k, i) => `
      ${i > 0 ? '<span class="key-plus">+</span>' : ''}
      <span class="key-tag">
        ${esc(k.toUpperCase())}
        <button class="remove-key" data-idx="${i}" title="Remove">×</button>
      </span>
    `).join('')
    container.querySelectorAll('.remove-key').forEach(btn => {
      btn.addEventListener('click', () => {
        mapping.keys.splice(Number(btn.dataset.idx), 1)
        renderComboTags(body)
      })
    })
  }

  function renderMacroEditor (body) {
    if (!Array.isArray(mapping.sequence)) mapping.sequence = []
    body.innerHTML = `
      <div class="macro-steps" id="macro-steps"></div>
      <button class="btn" id="add-step-btn" style="margin-bottom:8px;">${t('mapping.addStepBtn')}</button>
      <p class="notice">${t('mapping.macroNotice')}</p>
    `
    renderMacroSteps(body)
    body.querySelector('#add-step-btn').addEventListener('click', () => {
      mapping.sequence.push({ type: 'type', text: '' })
      renderMacroSteps(body)
    })
  }

  function renderMacroSteps (body) {
    const container = body.querySelector('#macro-steps')
    if (!container) return
    container.innerHTML = ''
    mapping.sequence.forEach((step, i) => {
      const row = document.createElement('div')
      row.className = 'macro-step'
      const valueField = buildStepValueField(step)
      row.innerHTML = `
        <span class="macro-step-num">${i + 1}.</span>
        <select class="step-type" data-idx="${i}">
          <option value="keydown"  ${step.type === 'keydown'  ? 'selected' : ''}>${t('mapping.stepKeydown')}</option>
          <option value="keyup"    ${step.type === 'keyup'    ? 'selected' : ''}>${t('mapping.stepKeyup')}</option>
          <option value="type"     ${step.type === 'type'     ? 'selected' : ''}>${t('mapping.stepType')}</option>
          <option value="delay"    ${step.type === 'delay'    ? 'selected' : ''}>${t('mapping.stepDelay')}</option>
        </select>
        ${valueField}
        <button class="del-step" data-idx="${i}" title="Delete step">×</button>
      `
      row.querySelector('.step-type').addEventListener('change', e => {
        const type = e.target.value
        mapping.sequence[i] = type === 'delay' ? { type, ms: 100 }
          : type === 'type' ? { type, text: '' }
          : { type, key: '' }
        renderMacroSteps(body)
      })
      const valInput = row.querySelector('.step-value')
      if (valInput) {
        valInput.addEventListener('input', e => {
          const type = mapping.sequence[i].type
          if (type === 'delay') mapping.sequence[i].ms = parseInt(e.target.value, 10) || 0
          else if (type === 'type') mapping.sequence[i].text = e.target.value
          else mapping.sequence[i].key = e.target.value.trim().toLowerCase()
        })
      }
      row.querySelector('.del-step').addEventListener('click', () => {
        mapping.sequence.splice(i, 1)
        renderMacroSteps(body)
      })
      container.appendChild(row)
    })
  }

  function renderDisableEditor (body) {
    body.innerHTML = `
      <p class="notice" style="margin-top:4px;">${t('mapping.disableNotice')}</p>
    `
  }

  function buildStepValueField (step) {
    if (step.type === 'keydown' || step.type === 'keyup') {
      return `<input class="step-value" type="text" value="${esc(step.key || '')}" placeholder="${t('mapping.stepKeyPlaceholder')}" spellcheck="false" autocomplete="off">`
    } else if (step.type === 'type') {
      return `<input class="step-value" type="text" value="${esc(step.text || '')}" placeholder="${t('mapping.stepTypePlaceholder')}" spellcheck="false">`
    } else if (step.type === 'delay') {
      return `<input class="step-value" type="number" min="0" max="10000" value="${step.ms ?? 100}" style="width:80px;">`
    }
    return ''
  }

  render()

  return {
    el,
    getMapping: () => deepCopy(mapping)
  }
}

function deepCopy (obj) {
  return JSON.parse(JSON.stringify(obj))
}

function esc (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
