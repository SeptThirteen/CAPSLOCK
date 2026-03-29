const IPC = {
  PROFILES_GET: 'profiles:get',
  PROFILES_SAVE: 'profiles:save',
  PROFILES_UPDATED: 'profiles:updated',
  PROFILE_CYCLE_NEXT: 'profile:cycle-next',
  PROFILE_CYCLED: 'profile:cycled',
  PROFILES_EXPORT: 'profiles:export',
  PROFILES_IMPORT: 'profiles:import',
  PROFILES_VALIDATE: 'profiles:validate',
  HOOK_TOGGLE: 'hook:toggle',
  HOOK_STATUS: 'hook:status',
  HOOK_STATUS_CHANGED: 'hook:status-changed',
  GAME_MODE_TOGGLE: 'game-mode:toggle',
  GAME_MODE_CHANGED: 'game-mode:changed',
  KEY_RECORD_START: 'key:record-start',
  KEY_RECORD_STOP: 'key:record-stop',
  KEY_RECORDED: 'key:recorded',
  APP_ACTIVE: 'app:active',
  REGISTRY_STATUS: 'registry:status',
  REGISTRY_APPLY: 'registry:apply',
  REGISTRY_REMOVE: 'registry:remove',
  LANG_SET: 'lang:set'
}

// iohook raw scancode -> human display label
const KEYCODE_MAP = {
  1: 'Escape', 2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7',
  9: '8', 10: '9', 11: '0', 12: '-', 13: '=', 14: 'Backspace', 15: 'Tab',
  16: 'Q', 17: 'W', 18: 'E', 19: 'R', 20: 'T', 21: 'Y', 22: 'U', 23: 'I',
  24: 'O', 25: 'P', 26: '[', 27: ']', 28: 'Enter', 29: 'Ctrl',
  30: 'A', 31: 'S', 32: 'D', 33: 'F', 34: 'G', 35: 'H', 36: 'J',
  37: 'K', 38: 'L', 39: ';', 40: "'", 41: '`', 42: 'Shift', 43: '\\',
  44: 'Z', 45: 'X', 46: 'C', 47: 'V', 48: 'B', 49: 'N', 50: 'M',
  51: ',', 52: '.', 53: '/', 54: 'RShift', 55: 'Num*',
  56: 'Alt', 57: 'Space', 58: 'CapsLock',
  59: 'F1', 60: 'F2', 61: 'F3', 62: 'F4', 63: 'F5', 64: 'F6',
  65: 'F7', 66: 'F8', 67: 'F9', 68: 'F10', 87: 'F11', 88: 'F12',
  71: 'Num7', 72: 'Num8', 73: 'Num9', 74: 'Num-', 75: 'Num4', 76: 'Num5',
  77: 'Num6', 78: 'Num+', 79: 'Num1', 80: 'Num2', 81: 'Num3', 82: 'Num0',
  83: 'Num.', 96: 'NumEnter', 97: 'RCtrl', 100: 'RAlt',
  102: 'Home', 103: 'Up', 104: 'PageUp', 105: 'Left', 106: 'Right',
  107: 'End', 108: 'Down', 109: 'PageDown', 110: 'Insert', 111: 'Delete',
  125: 'Win', 126: 'RWin', 127: 'Menu'
}

// iohook raw scancode -> config key string (used in mapping.key / mapping.keys)
const KEYCODE_TO_CONFIG_KEY = {
  1: 'escape', 14: 'backspace', 15: 'tab', 28: 'enter', 29: 'ctrl',
  42: 'shift', 54: 'shift', 56: 'alt', 57: 'space', 97: 'ctrl', 100: 'alt',
  102: 'home', 103: 'up', 104: 'pageup', 105: 'left', 106: 'right',
  107: 'end', 108: 'down', 109: 'pagedown', 110: 'insert', 111: 'delete',
  125: 'win', 126: 'win',
  59: 'f1', 60: 'f2', 61: 'f3', 62: 'f4', 63: 'f5', 64: 'f6',
  65: 'f7', 66: 'f8', 67: 'f9', 68: 'f10', 87: 'f11', 88: 'f12',
  16: 'q', 17: 'w', 18: 'e', 19: 'r', 20: 't', 21: 'y', 22: 'u',
  23: 'i', 24: 'o', 25: 'p', 30: 'a', 31: 's', 32: 'd', 33: 'f',
  34: 'g', 35: 'h', 36: 'j', 37: 'k', 38: 'l', 44: 'z', 45: 'x',
  46: 'c', 47: 'v', 48: 'b', 49: 'n', 50: 'm',
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8',
  10: '9', 11: '0', 12: '-', 13: '=', 26: '[', 27: ']', 43: '\\',
  39: ';', 40: "'", 51: ',', 52: '.', 53: '/', 41: '`'
}

module.exports = { IPC, KEYCODE_MAP, KEYCODE_TO_CONFIG_KEY }