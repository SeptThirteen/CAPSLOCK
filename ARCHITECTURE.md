# CAPSLOCK 技术架构文档

## 目录
1. [项目概述](#1-项目概述)
2. [架构设计](#2-架构设计)
3. [模块说明](#3-模块说明)
4. [重构指南](#4-重构指南)
5. [扩展开发](#5-扩展开发)

---

## 1. 项目概述

CAPSLOCK 是一个基于 Electron 的 Windows 桌面应用，用于将 CapsLock 键重新映射为任意按键、组合键或宏序列。

### 技术栈
- **框架**: Electron 28.3.0
- **键盘钩子**: uiohook-napi (N-API 原生模块)
- **系统调用**: koffi (Win32 FFI)
- **配置存储**: electron-store
- **语言**: JavaScript (ES Modules for renderer)

### 核心功能
- 单键映射 (escape, f5, etc.)
- 组合键映射 (Ctrl+Shift+P)
- 宏序列 (按键、文字输入、延迟、启动应用)
- 按应用切换配置
- CapsLock LED 抑制（纯钩子实现，无注册表修改）

---

## 2. 架构设计

### 2.1 进程模型

```
┌─────────────────────────────────────────────────────────┐
│                     Main Process                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   hook.js   │  │ key-sim.js  │  │ window-detect.js│ │
│  │ (uiohook)   │  │ (SendInput) │  │ (GetForeground) │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │                │                 │            │
│         └────────────────┼─────────────────┘            │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              profile-manager.js                  │   │
│  │           (electron-store 配置管理)              │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              ipc-handlers.js                     │   │
│  │              (IPC 通道管理)                      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │ IPC
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Renderer Process                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ renderer.js │  │   i18n.js   │  │   components/   │ │
│  │ (主逻辑)     │  │ (国际化)    │  │ (UI组件)        │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
用户按下 CapsLock
       │
       ▼
┌──────────────┐
│   hook.js    │ ← uiohook-napi 捕获键盘事件
└──────────────┘
       │
       ▼
┌──────────────┐
│profile-mgr.js│ ← 根据当前窗口匹配配置
└──────────────┘
       │
       ▼
┌──────────────┐
│ key-sim.js   │ ← SendInput 模拟按键/启动应用
└──────────────┘
```

### 2.3 配置数据结构

```javascript
{
  version: 1,
  enabled: true,
  macroSpeedMs: 10,
  profiles: [
    {
      id: "unique-id",
      name: "Profile Name",
      matcher: {
        processName: "code.exe",
        processNameMatchType: "exact|contains|regex",
        windowTitle: "optional",
        windowTitleMatchType: "contains|regex"
      },
      mapping: {
        type: "key|combo|macro|disable",
        // type: key
        key: "escape",
        // type: combo
        keys: ["ctrl", "shift", "p"],
        // type: macro
        sequence: [
          { type: "keydown", key: "ctrl" },
          { type: "keyup", key: "ctrl" },
          { type: "type", text: "Hello" },
          { type: "delay", ms: 100 },
          { type: "launch", path: "notepad.exe", args: "" }
        ]
      }
    }
  ]
}
```

---

## 3. 模块说明

### 3.1 Main Process 模块

#### index.js - 应用入口
- 创建 BrowserWindow
- 初始化各模块
- 处理生命周期事件

#### hook.js - 键盘钩子
- 使用 uiohook-napi 监听全局键盘事件
- CapsLock 按键拦截和 LED 抑制
- 按键录制模式

```javascript
// 核心 API
start(win)           // 启动钩子
stop()               // 停止钩子
setEnabled(bool)     // 启用/禁用
startRecording()     // 开始录制
stopRecording()      // 停止录制
setSuppression(bool) // 设置 LED 抑制
turnOffCapsLockLED() // 关闭 LED
```

#### key-simulator.js - 按键模拟
- Win32 SendInput 模拟按键
- Unicode 字符输入
- 应用启动

**支持的键码类别**:
- 基础键: a-z, 0-9
- 功能键: f1-f24
- 控制键: escape, tab, enter, backspace, space
- 导航键: home, end, pageup, pagedown, insert, delete
- 方向键: up, down, left, right
- 修饰键: ctrl, shift, alt, win
- 媒体键: volumemute, volumedown, volumeup, mediaplaypause, medianexttrack, mediaprevtrack, mediastop
- 浏览器键: browserback, browserforward, browserrefresh, browserstop, browsersearch, browserfavorites, browserhome
- 启动键: launchmail, launchmediaselect, launchapp1, launchapp2
- 特殊键: printscreen, pause, apps, sleep
- 小键盘: num0-num9, numadd, numsubtract, nummultiply, numdivide, numdecimal

#### window-detector.js - 窗口检测
- 轮询获取前台窗口
- 提取进程名和窗口标题

#### profile-manager.js - 配置管理
- electron-store 持久化
- 配置匹配逻辑

#### ipc-handlers.js - IPC 处理
- 注册所有 IPC 通道
- 配置验证逻辑
- 导入导出功能

#### tray.js - 系统托盘
- 托盘图标和菜单
- 双语支持

### 3.2 Renderer Process 模块

#### renderer.js - 主渲染逻辑
- 状态管理
- UI 事件处理
- IPC 通信
- 搜索过滤
- 冲突检测
- 导入导出

#### i18n.js - 国际化
- 中英文翻译
- localStorage 持久化语言选择

#### components/
- **ProfileList.js** - 配置列表组件（支持搜索和冲突指示）
- **ProfileEditor.js** - 配置编辑器
- **MappingEditor.js** - 映射编辑器（支持启动应用步骤）

---

## 4. 重构指南

### 4.1 推荐的模块化改进

#### 当前问题
1. **hook.js 职责过多** - 混合了钩子管理、按键录制、LED 抑制
2. **ipc-handlers.js 体积大** - 所有处理函数在一个文件
3. **缺少服务层** - 业务逻辑与 IPC 层耦合

#### 建议的新架构

```
src/main/
├── index.js              # 入口（不变）
├── services/             # 新增：业务服务层
│   ├── HookService.js    # 键盘钩子服务
│   ├── ProfileService.js # 配置管理服务
│   ├── SimulatorService.js # 按键模拟服务
│   └── WindowService.js  # 窗口检测服务
├── ipc/                  # 新增：IPC 处理层
│   ├── index.js          # IPC 注册入口
│   ├── profiles.js       # 配置相关 IPC
│   ├── hook.js           # 钩子相关 IPC
│   └── system.js         # 系统相关 IPC
├── utils/                # 新增：工具函数
│   ├── win32.js          # Win32 API 封装
│   ├── logger.js         # 日志工具
│   └── validator.js      # 验证工具
├── tray.js               # 托盘（不变）
└── preload.js            # 预加载（不变）
```

### 4.2 服务层示例

```javascript
// services/HookService.js
class HookService {
  constructor() {
    this.enabled = true
    this.recording = false
    this.suppression = true
    this.uIOhook = null
    this.listeners = new Map()
  }

  async initialize() {
    try {
      const { uIOhook, UiohookKey } = require('uiohook-napi')
      this.uIOhook = uIOhook
      this.UiohookKey = UiohookKey
      return true
    } catch (e) {
      console.error('[HookService] Failed to load uiohook:', e)
      return false
    }
  }

  start() { /* ... */ }
  stop() { /* ... */ }
  
  on(event, callback) {
    this.listeners.set(event, callback)
  }

  emit(event, data) {
    const cb = this.listeners.get(event)
    if (cb) cb(data)
  }
}

module.exports = new HookService()
```

### 4.3 IPC 分离示例

```javascript
// ipc/profiles.js
const { ipcMain } = require('electron')
const ProfileService = require('../services/ProfileService')
const { IPC } = require('../../shared/constants')

function register(mainWindow) {
  ipcMain.handle(IPC.PROFILES_GET, () => {
    return ProfileService.getAll()
  })

  ipcMain.handle(IPC.PROFILES_SAVE, (_, config) => {
    return ProfileService.save(config)
  })
}

module.exports = { register }
```

### 4.4 错误处理改进

```javascript
// utils/logger.js
const levels = { debug: 0, info: 1, warn: 2, error: 3 }
let currentLevel = levels.info

function log(level, module, message, ...args) {
  if (levels[level] >= currentLevel) {
    const timestamp = new Date().toISOString()
    console[level](`[${timestamp}] [${module}] ${message}`, ...args)
  }
}

module.exports = {
  debug: (mod, msg, ...args) => log('debug', mod, msg, ...args),
  info: (mod, msg, ...args) => log('info', mod, msg, ...args),
  warn: (mod, msg, ...args) => log('warn', mod, msg, ...args),
  error: (mod, msg, ...args) => log('error', mod, msg, ...args),
  setLevel: (level) => { currentLevel = levels[level] || levels.info }
}
```

---

## 5. 扩展开发

### 5.1 添加新按键支持

在 `key-simulator.js` 的 VK 对象中添加：

```javascript
const VK = {
  // ... 现有键码
  customkey: 0xXX,  // 虚拟键码
}

// 如果是扩展键，还需添加到 EXTENDED_VK
const EXTENDED_VK = new Set([
  // ... 现有扩展键
  0xXX,  // 新增扩展键
])
```

### 5.2 添加新宏步骤类型

1. 在 `key-simulator.js` 的 `simulateMapping()` 中添加处理
2. 在 `MappingEditor.js` 中添加 UI
3. 在 `i18n.js` 中添加翻译

### 5.3 添加新匹配条件

1. 在 `profile-manager.js` 的 `matchesWindow()` 中添加逻辑
2. 在 `ProfileEditor.js` 中添加 UI 输入

---

## 附录

### A. 虚拟键码参考

| 键名 | 十六进制 | 说明 |
|------|---------|------|
| VK_BACK | 0x08 | Backspace |
| VK_TAB | 0x09 | Tab |
| VK_RETURN | 0x0D | Enter |
| VK_ESCAPE | 0x1B | Esc |
| VK_SPACE | 0x20 | Space |
| VK_F1-F12 | 0x70-0x7B | 功能键 |
| VK_F13-F24 | 0x7C-0x87 | 扩展功能键 |
| VK_VOLUME_MUTE | 0xAD | 静音 |
| VK_VOLUME_DOWN | 0xAE | 音量减 |
| VK_VOLUME_UP | 0xAF | 音量加 |
| VK_MEDIA_PLAY_PAUSE | 0xB3 | 播放/暂停 |

### B. IPC 通道列表

| 通道 | 方向 | 说明 |
|------|------|------|
| profiles:get | R→M | 获取配置 |
| profiles:save | R→M | 保存配置 |
| profiles:updated | M→R | 配置已更新 |
| profiles:export | R→M | 导出配置 |
| profiles:import | R→M | 导入配置 |
| profiles:validate | R→M | 验证配置 |
| hook:toggle | R→M | 切换钩子 |
| hook:status | R→M | 获取钩子状态 |
| key:record-start | R→M | 开始录制 |
| key:record-stop | R→M | 停止录制 |
| key:recorded | M→R | 录制结果 |
| app:active | M→R | 当前活动应用 |

### C. 本次更新文件清单

1. `src/main/index.js` - 错误处理增强
2. `src/main/hook.js` - 纯钩子抑制，移除注册表依赖
3. `src/main/key-simulator.js` - 扩展键盘支持 + 启动应用
4. `src/main/ipc-handlers.js` - 导入导出 + 验证
5. `src/main/preload.js` - 新 API 暴露
6. `src/shared/constants.js` - 新 IPC 通道
7. `src/renderer/index.html` - 搜索框 + 导入导出按钮
8. `src/renderer/renderer.js` - 搜索 + 冲突检测 + 导入导出
9. `src/renderer/styles.css` - 新样式
10. `src/renderer/i18n.js` - 新翻译
11. `src/renderer/components/ProfileList.js` - 搜索 + 冲突指示
12. `src/renderer/components/MappingEditor.js` - 启动应用步骤

---

*文档版本: 1.0.0*
*最后更新: 2026-03-27*
