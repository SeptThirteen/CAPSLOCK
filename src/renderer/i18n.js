// i18n.js — lightweight internationalization for the renderer
// Supported languages: 'zh' (Simplified Chinese) and 'en' (English)
// Persists choice to localStorage under the key 'capslock:lang'

const translations = {
  en: {
    header: {
      enabled:    'Enabled',
      disabled:   'Disabled',
      langSwitch: '中文',
      themeDark:  'Dark',
      themeLight: 'Light',
      gameMode:   'Game Mode',
      gameOn:     'ON',
      gameOff:    'OFF',
      gameModeOn: 'Game mode enabled',
      gameModeOff:'Game mode disabled'
    },
    banner: {
      warning:     'Caps Lock is not fully suppressed — LED may still toggle.',
      enableBtn:   'Enable full suppression (restart required)',
      updated:     'Registry updated. Please restart your computer to activate full suppression.',
      applyFailed: 'Failed to apply registry change: '
    },
    sidebar: {
      profiles:    'Profiles',
      addProfile:  '+ Add Profile',
      activeApp:   'Active app',
      search:      'Search profiles...',
      noResults:   'No matching profiles',
      importExport:'Import/Export'
    },
    editor: {
      emptyState: 'Select a profile to edit'
    },
    profile: {
      sectionTitle:       'Profile',
      nameLabel:          'Name',
      namePlaceholder:    'Profile name',
      matcherTitle:       'App Matcher',
      matcherNotice:      'This profile activates when the foreground window matches these criteria.\nLeave a field empty to skip that check.',
      processLabel:       'Process',
      processPlaceholder: 'e.g. Code.exe',
      titleLabel:         'Title',
      titlePlaceholder:   'Window title (optional)',
      matchExact:         'exact',
      matchContains:      'contains',
      matchRegex:         'regex',
      deleteBtn:          'Delete Profile',
      saveBtn:            'Save Profile',
      deleteConfirm:      'Delete profile "{name}"?',
      newName:            'New Profile',
      saveFailed:         'Failed to save: ',
      unnamed:            'Unnamed'
    },
    mapping: {
      sectionTitle:       'Caps Lock Action',
      typeKey:            'Single Key',
      typeCombo:          'Combo',
      typeMacro:          'Macro',
      typeDisable:        'Disabled',
      keyLabel:           'Key',
      keyPlaceholder:     'escape, ctrl, f5, a\u2026',
      recordKeyBtn:       'Record Key',
      clearBtn:           'Clear',
      keyNotice:          'Type a key name (e.g. escape, ctrl, f5, f13-f24, volumeup) or click Record.',
      recordComboBtn:     'Record Keys',
      clearAllBtn:        'Clear All',
      comboNotice:        'Hold modifier keys and press the target key together, then click Record Keys.',
      comboEmpty:         'No keys set \u2014 click Record Keys',
      addStepBtn:         '+ Add Step',
      macroNotice:        'Steps execute in order. Use \u2018type\u2019 for text, \u2018delay\u2019 for pause (ms), \u2018launch\u2019 to open apps.',
      stepKeydown:        'keydown',
      stepKeyup:          'keyup',
      stepType:           'type',
      stepDelay:          'delay (ms)',
      stepLaunch:         'launch app',
      stepKeyPlaceholder: 'escape, ctrl, a, f5\u2026',
      stepTypePlaceholder:'text to type\u2026',
      stepLaunchPath:     'App path or name',
      stepLaunchArgs:     'Arguments',
      disableNotice:      'CapsLock will do nothing when this profile is active. Useful for games or full-screen apps.'
    },
    recording: {
      listening: '\u23fa Listening\u2026'
    },
    shortcuts: {
      profileCycled: 'Switched to profile: {name}'
    },
    importExport: {
      title:           'Import / Export',
      exportBtn:       'Export Profiles',
      importBtn:       'Import Profiles',
      importMerge:     'Merge with existing',
      importReplace:   'Replace all',
      exportSuccess:   'Profiles exported successfully!',
      exportCanceled:  'Export canceled',
      importSuccess:   'Imported {count} profiles',
      importMerged:    'Imported {imported} profiles, {skipped} skipped',
      importCanceled:  'Import canceled',
      importError:     'Import failed: ',
      exportError:     'Export failed: '
    },
    validation: {
      title:           'Configuration Issues',
      noIssues:        'No issues found',
      conflictTitle:   'Conflicts',
      warningTitle:    'Warnings',
      duplicateProcess:'Multiple profiles match the same process'
    }
  },

  zh: {
    header: {
      enabled:    '\u5df2\u542f\u7528',
      disabled:   '\u5df2\u7981\u7528',
      langSwitch: 'EN',
      themeDark:  '\u6df1\u8272',
      themeLight: '\u6d45\u8272',
      gameMode:   '\u6e38\u620f\u6a21\u5f0f',
      gameOn:     '\u5f00',
      gameOff:    '\u5173',
      gameModeOn: '\u5df2\u5f00\u542f\u6e38\u620f\u6a21\u5f0f',
      gameModeOff:'\u5df2\u5173\u95ed\u6e38\u620f\u6a21\u5f0f'
    },
    banner: {
      warning:     'Caps Lock \u672a\u88ab\u5b8c\u5168\u6291\u5236 \u2014 LED \u6307\u793a\u706f\u53ef\u80fd\u4ecd\u4f1a\u95ea\u70c1\u3002',
      enableBtn:   '\u542f\u7528\u5b8c\u5168\u6291\u5236\uff08\u9700\u8981\u91cd\u542f\uff09',
      updated:     '\u6ce8\u518c\u8868\u5df2\u66f4\u65b0\u3002\u8bf7\u91cd\u542f\u8ba1\u7b97\u673a\u4ee5\u6fc0\u6d3b\u5b8c\u5168\u6291\u5236\u3002',
      applyFailed: '\u5e94\u7528\u6ce8\u518c\u8868\u66f4\u6539\u5931\u8d25\uff1a'
    },
    sidebar: {
      profiles:    '\u914d\u7f6e\u65b9\u6848',
      addProfile:  '+ \u65b0\u5efa\u914d\u7f6e',
      activeApp:   '\u5f53\u524d\u5e94\u7528',
      search:      '\u641c\u7d22\u914d\u7f6e...',
      noResults:   '\u65e0\u5339\u914d\u7684\u914d\u7f6e',
      importExport:'\u5bfc\u5165/\u5bfc\u51fa'
    },
    editor: {
      emptyState: '\u8bf7\u9009\u62e9\u4e00\u4e2a\u914d\u7f6e\u65b9\u6848\u8fdb\u884c\u7f16\u8f91'
    },
    profile: {
      sectionTitle:       '\u914d\u7f6e\u65b9\u6848',
      nameLabel:          '\u540d\u79f0',
      namePlaceholder:    '\u914d\u7f6e\u65b9\u6848\u540d\u79f0',
      matcherTitle:       '\u5e94\u7528\u5339\u914d',
      matcherNotice:      '\u5f53\u524d\u53f0\u7a97\u53e3\u7b26\u5408\u4ee5\u4e0b\u6761\u4ef6\u65f6\uff0c\u6b64\u914d\u7f6e\u65b9\u6848\u81ea\u52a8\u6fc0\u6d3b\u3002\n\u7559\u7a7a\u5219\u8df3\u8fc7\u8be5\u9879\u68c0\u67e5\u3002',
      processLabel:       '\u8fdb\u7a0b',
      processPlaceholder: '\u4f8b\u5982 Code.exe',
      titleLabel:         '\u7a97\u53e3\u6807\u9898',
      titlePlaceholder:   '\u7a97\u53e3\u6807\u9898\uff08\u53ef\u9009\uff09',
      matchExact:         '\u7cbe\u786e\u5339\u914d',
      matchContains:      '\u5305\u542b',
      matchRegex:         '\u6b63\u5219',
      deleteBtn:          '\u5220\u9664\u914d\u7f6e',
      saveBtn:            '\u4fdd\u5b58\u914d\u7f6e',
      deleteConfirm:      '\u786e\u5b9a\u8981\u5220\u9664\u914d\u7f6e\u65b9\u6848\u201c{name}\u201d\u5417\uff1f',
      newName:            '\u65b0\u5efa\u914d\u7f6e',
      saveFailed:         '\u4fdd\u5b58\u5931\u8d25\uff1a',
      unnamed:            '\u672a\u547d\u540d'
    },
    mapping: {
      sectionTitle:       'Caps Lock \u6620\u5c04',
      typeKey:            '\u5355\u952e',
      typeCombo:          '\u7ec4\u5408\u952e',
      typeMacro:          '\u5b8f',
      typeDisable:        '\u7981\u7528',
      keyLabel:           '\u6309\u952e',
      keyPlaceholder:     'escape, ctrl, f5, a\u2026',
      recordKeyBtn:       '\u5f55\u5236\u6309\u952e',
      clearBtn:           '\u6e05\u9664',
      keyNotice:          '\u8f93\u5165\u6309\u952e\u540d\u79f0\uff08\u5982 escape\u3001ctrl\u3001f5\u3001f13-f24\u3001volumeup\uff09\u6216\u70b9\u51fb\u5f55\u5236\u3002',
      recordComboBtn:     '\u5f55\u5236\u7ec4\u5408\u952e',
      clearAllBtn:        '\u5168\u90e8\u6e05\u9664',
      comboNotice:        '\u540c\u65f6\u6309\u4f4f\u4fee\u9970\u952e\u548c\u76ee\u6807\u952e\uff0c\u7136\u540e\u70b9\u51fb\u5f55\u5236\u7ec4\u5408\u952e\u3002',
      comboEmpty:         '\u672a\u8bbe\u7f6e\u6309\u952e \u2014 \u8bf7\u70b9\u51fb\u5f55\u5236\u7ec4\u5408\u952e',
      addStepBtn:         '+ \u6dfb\u52a0\u6b65\u9aa4',
      macroNotice:        '\u6b65\u9aa4\u6309\u987a\u5e8f\u6267\u884c\u3002\u4f7f\u7528\u300c\u8f93\u5165\u6587\u5b57\u300d\u8f93\u5165\u6587\u672c\uff0c\u4f7f\u7528\u300c\u5ef6\u8fdf\u300d\u8bbe\u7f6e\u6682\u505c\uff0c\u4f7f\u7528\u300c\u542f\u52a8\u5e94\u7528\u300d\u6253\u5f00\u7a0b\u5e8f\u3002',
      stepKeydown:        '\u6309\u4e0b',
      stepKeyup:          '\u677e\u5f00',
      stepType:           '\u8f93\u5165\u6587\u5b57',
      stepDelay:          '\u5ef6\u8fdf\uff08\u6beb\u79d2\uff09',
      stepLaunch:         '\u542f\u52a8\u5e94\u7528',
      stepKeyPlaceholder: 'escape, ctrl, a, f5\u2026',
      stepTypePlaceholder:'\u8981\u8f93\u5165\u7684\u6587\u5b57\u2026',
      stepLaunchPath:     '\u5e94\u7528\u8def\u5f84\u6216\u540d\u79f0',
      stepLaunchArgs:     '\u53c2\u6570',
      disableNotice:      '\u5f53\u6b64\u914d\u7f6e\u65b9\u6848\u6fc0\u6d3b\u65f6\uff0cCapsLock \u4e0d\u6267\u884c\u4efb\u4f55\u64cd\u4f5c\u3002\u9002\u7528\u4e8e\u6e38\u620f\u6216\u5168\u5c4f\u5e94\u7528\u3002'
    },
    recording: {
      listening: '\u23fa \u76d1\u542c\u4e2d\u2026'
    },
    shortcuts: {
      profileCycled: '\u5df2\u5207\u6362\u5230\u914d\u7f6e\uff1a{name}'
    },
    importExport: {
      title:           '\u5bfc\u5165 / \u5bfc\u51fa',
      exportBtn:       '\u5bfc\u51fa\u914d\u7f6e',
      importBtn:       '\u5bfc\u5165\u914d\u7f6e',
      importMerge:     '\u5408\u5e76\u5230\u73b0\u6709\u914d\u7f6e',
      importReplace:   '\u66ff\u6362\u6240\u6709\u914d\u7f6e',
      exportSuccess:   '\u914d\u7f6e\u5bfc\u51fa\u6210\u529f\uff01',
      exportCanceled:  '\u5bfc\u51fa\u5df2\u53d6\u6d88',
      importSuccess:   '\u5df2\u5bfc\u5165 {count} \u4e2a\u914d\u7f6e',
      importMerged:    '\u5df2\u5bfc\u5165 {imported} \u4e2a\u914d\u7f6e\uff0c\u8df3\u8fc7 {skipped} \u4e2a',
      importCanceled:  '\u5bfc\u5165\u5df2\u53d6\u6d88',
      importError:     '\u5bfc\u5165\u5931\u8d25\uff1a',
      exportError:     '\u5bfc\u51fa\u5931\u8d25\uff1a'
    },
    validation: {
      title:           '\u914d\u7f6e\u95ee\u9898',
      noIssues:        '\u672a\u53d1\u73b0\u95ee\u9898',
      conflictTitle:   '\u51b2\u7a81',
      warningTitle:    '\u8b66\u544a',
      duplicateProcess:'\u591a\u4e2a\u914d\u7f6e\u5339\u914d\u540c\u4e00\u8fdb\u7a0b'
    }
  }
}

// ── State ─────────────────────────────────────────────────────────────────────

let _lang = (typeof localStorage !== 'undefined' && localStorage.getItem('capslock:lang')) || 'zh'

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Translate a dot-path key, e.g. t('profile.saveBtn') → '保存配置'
 * Supports a single {name} placeholder substitution via the second argument.
 */
export function t (key, vars) {
  const parts = key.split('.')
  let obj = translations[_lang]
  for (const p of parts) {
    if (obj == null || typeof obj !== 'object') return key
    obj = obj[p]
  }
  if (typeof obj !== 'string') return key
  if (vars) {
    return obj.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''))
  }
  return obj
}

/** Returns the current language code ('zh' | 'en'). */
export function getLang () {
  return _lang
}

/**
 * Switch the active language and notify all listeners via a browser 'langchange' event.
 */
export function setLang (lang) {
  if (!translations[lang] || lang === _lang) return
  _lang = lang
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('capslock:lang', lang)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }
  window.dispatchEvent(new Event('langchange'))
}
