# CAPSLOCK

> **中文** | [English](#english)

---

## 简介

CAPSLOCK 是一款 Windows 系统托盘应用，将 Caps Lock 键重新映射为任意按键、组合键或宏序列，并支持按应用程序切换不同的配置方案。

## 功能特性

- **单键映射** — 将 Caps Lock 替换为任意虚拟键（如 Escape、F5、Tab 等）
- **组合键** — 触发多键组合（如 Ctrl+Shift+P）
- **宏序列** — 按顺序执行任意步骤：按下/松开键、输入文字、延迟等
- **按应用配置** — 根据前台窗口的进程名称或标题自动切换配置方案
- **按键录制** — 点击录制按钮捕获实际按键，无需手动输入键名
- **系统托盘** — 最小化到系统托盘后台运行；支持右键菜单快速启用/禁用
- **完全抑制** — 可将 Caps Lock 在注册表级别重新映射为 F13，彻底消除 LED 闪烁
- **中英双语** — 界面支持中文 / English 切换

---

## 系统要求

| 项目 | 要求 |
|---|---|
| 操作系统 | Windows 10 / 11（x64） |
| Node.js | 18 或更高版本（仅开发时需要） |
| npm | 8 或更高版本（随 Node.js 附带） |
| Electron | 28.3.0（由 npm 自动安装） |
| 架构 | x64（不支持 ARM） |

---

## 快速开始（开发模式）

### 第一步：安装 Node.js

如果尚未安装：

1. 访问 [https://nodejs.org](https://nodejs.org) 下载 **LTS** 版本（18.x 或更高）
2. 运行安装程序，勾选"Add to PATH"选项
3. 安装完成后打开**新的**命令提示符，验证安装：

```
node --version   # 输出示例：v20.11.0
npm --version    # 输出示例：10.2.4
```

### 第二步：克隆或下载项目

```
git clone <仓库地址>
cd CAPSLOCK
```

或者直接解压 ZIP 包到任意目录，然后进入该目录。

### 第三步：安装依赖

```
npm install
```

**企业网络 / 代理注意事项**

如果 `npm install` 报 SSL 证书错误（`UNABLE_TO_VERIFY_LEAF_SIGNATURE`），说明企业代理使用了自签名 CA，请使用：

```
NODE_OPTIONS="--use-system-ca" npm install
```

如果 npm 对默认缓存目录没有写入权限，请先将其重定向到用户目录：

```
npm config set cache "%USERPROFILE%\npm-cache"
npm config set prefix "%USERPROFILE%\npm-global"
```

首次安装约需下载 300–400 个包（包含 Electron 二进制文件，约 100 MB），视网速需要几分钟。

### 第四步：启动应用

```
npm start
```

启动成功的标志：

- 系统托盘区域出现 CAPSLOCK 图标
- 终端打印 `[hook] mode=DIRECT(CapsLock)  keycode=0x3a`，表示键盘钩子已激活
- 如弹出 Windows 防火墙窗口，点击"允许访问"

### 全部脚本命令

| 命令 | 说明 |
|---|---|
| `npm start` | 启动应用（正常模式） |
| `npm run dev` | 启动并开启 Node.js 调试端口 5858（Chrome DevTools 可附加） |
| `npm run build` | 打包为 Windows NSIS 安装程序（.exe），输出到 `dist/` 目录 |

---

## 使用说明

1. 启动后双击托盘图标（或右键 → 显示 / 隐藏）打开配置界面
2. 点击左侧 **+ 新建配置** 创建配置方案
3. 在"**应用匹配**"中填写目标程序的进程名称（如 `Code.exe`）或窗口标题片段
4. 在"**Caps Lock 映射**"中选择映射类型：
   - **单键** — 输入按键名称（`escape`、`f5`、`tab`、`a` 等）或点击"录制按键"
   - **组合键** — 点击"录制组合键"后，**先按住**修饰键（Ctrl / Shift / Alt / Win），再按目标键，然后松开所有键
   - **宏** — 添加多个步骤，支持按下键、松开键、输入文字、毫秒延迟
5. 点击"**保存配置**"
6. 切换到目标应用程序，按 Caps Lock 即可触发对应动作

### 启用完全抑制（消除 Caps Lock LED 闪烁）

首次启动若出现黄色警告条，表示按下 Caps Lock 时 LED 指示灯仍会闪烁。
点击"**启用完全抑制（需要重启）**"，应用将向注册表写入扫描码映射，在驱动层将 Caps Lock 重定向为 F13，彻底屏蔽 LED。
**重启电脑后**生效。

---

## 项目结构

```
CAPSLOCK/
├── src/
│   ├── main/
│   │   ├── index.js           # 主进程入口，BrowserWindow 创建
│   │   ├── preload.js         # contextBridge API 暴露给渲染进程
│   │   ├── tray.js            # 系统托盘及右键菜单（支持中英切换）
│   │   ├── hook.js            # 全局键盘钩子（uiohook-napi）
│   │   ├── window-detector.js # 前台窗口检测（koffi + Win32 API）
│   │   ├── key-simulator.js   # 按键模拟（SendInput via koffi）
│   │   ├── profile-manager.js # 配置方案加载/保存（electron-store）
│   │   ├── ipc-handlers.js    # 所有 IPC 通道注册
│   │   └── registry.js        # 注册表扫描码映射（Caps Lock -> F13）
│   ├── renderer/
│   │   ├── index.html         # 配置器 UI 入口
│   │   ├── renderer.js        # 主渲染逻辑与 i18n 初始化
│   │   ├── styles.css         # 全局样式（深色主题，支持中文字体）
│   │   ├── i18n.js            # 中英文翻译模块
│   │   └── components/
│   │       ├── ProfileList.js   # 左侧配置方案列表
│   │       ├── ProfileEditor.js # 配置方案编辑面板
│   │       └── MappingEditor.js # 映射编辑器（单键/组合键/宏）
│   └── shared/
│       └── constants.js       # IPC 通道名称、键码映射表
├── assets/
│   └── tray-icon.ico
├── electron-builder.config.js
├── package.json
└── README.md
```

---

## 关键依赖

| 包 | 用途 |
|---|---|
| `uiohook-napi` v1.5.4 | 全局键盘钩子（WH_KEYBOARD_LL），N-API 稳定 ABI，无需重新编译 |
| `koffi` v2.15.1 | Win32 FFI：SendInput、GetForegroundWindow、GetModuleFileNameExW |
| `electron-store` v8 | 配置持久化，保存至 `%APPDATA%\CAPSLOCK\config.json` |
| `electron` v28.3.0 | 应用框架 |
| `electron-builder` | NSIS 安装程序打包 |

---

## 配置文件格式

配置存储于 `%APPDATA%\CAPSLOCK\config.json`：

```json
{
  "version": 1,
  "enabled": true,
  "profiles": [
    {
      "id": "default",
      "name": "默认",
      "matcher": null,
      "mapping": { "type": "key", "key": "escape" }
    },
    {
      "id": "vscode",
      "name": "VS Code",
      "matcher": {
        "processName": "Code.exe",
        "processNameMatchType": "exact",
        "windowTitle": null,
        "windowTitleMatchType": "contains"
      },
      "mapping": { "type": "combo", "keys": ["ctrl", "shift", "p"] }
    },
    {
      "id": "macro1",
      "name": "宏示例",
      "matcher": { "processName": "notepad.exe", "processNameMatchType": "contains" },
      "mapping": {
        "type": "macro",
        "sequence": [
          { "type": "type", "text": "Hello, World!" },
          { "type": "delay", "ms": 200 },
          { "type": "keydown", "key": "enter" },
          { "type": "keyup", "key": "enter" }
        ]
      }
    }
  ]
}
```

---

## 常见问题

**Q: 按 Caps Lock 没有任何反应**
确认系统托盘右键菜单中"禁用映射"未被点击（当前应为"禁用映射"可点击，表示现在为启用状态）。若应用以普通权限运行，部分管理员权限窗口（如任务管理器）的键盘事件无法被拦截；以管理员身份运行应用即可解决。

**Q: 组合键录制只录到一个键**
已修复。操作方法：先按住修饰键（Ctrl / Shift / Alt / Win），再按目标键。单独按下修饰键时录制不会结束，只有按下非修饰键才会完成录制并包含所有已按住的修饰键。

**Q: `npm install` 报 SSL 证书错误**
企业代理问题。使用 `NODE_OPTIONS="--use-system-ca" npm install`。

**Q: 应用启动崩溃，报 `Cannot read properties of undefined (reading 'requestSingleInstanceLock')`**
环境变量 `ELECTRON_RUN_AS_NODE=1` 使 Electron 以纯 Node.js 模式运行，导致 `require('electron')` 返回路径字符串而非模块。使用 `npm start`（已内置 `env -u ELECTRON_RUN_AS_NODE`）即可，或手动执行前先 `unset ELECTRON_RUN_AS_NODE`。

---

## 许可证

MIT

---

<a name="english"></a>

# CAPSLOCK

> [中文](#capslock) | **English**

---

## Overview

CAPSLOCK is a Windows system-tray application that remaps the Caps Lock key to any key, key combination, or macro sequence, with automatic per-application profile switching.

## Features

- **Single key** — Replace Caps Lock with any virtual key (Escape, F5, Tab, etc.)
- **Combo** — Fire multi-key combinations (e.g. Ctrl+Shift+P)
- **Macro** — Execute ordered steps: keydown/keyup events, text typing, delays
- **Per-app profiles** — Automatically switch profiles based on foreground window process name or title
- **Key recorder** — Capture actual keypresses with one click instead of typing key names
- **System tray** — Runs silently in the background; right-click menu for quick enable/disable
- **Full suppression** — Optionally remap Caps Lock to F13 at the registry level to eliminate LED flicker
- **Bilingual UI** — Switch between Chinese (中文) and English at any time

---

## Requirements

| Item | Requirement |
|---|---|
| OS | Windows 10 / 11 (x64) |
| Node.js | 18 or higher (development only) |
| npm | 8 or higher (bundled with Node.js) |
| Electron | 28.3.0 (installed automatically via npm) |
| Architecture | x64 (ARM not supported) |

---

## Quick Start (Development Mode)

### Step 1 — Install Node.js

If not already installed:

1. Download the **LTS** release (18.x or higher) from [https://nodejs.org](https://nodejs.org)
2. Run the installer — make sure **"Add to PATH"** is checked
3. Open a **new** terminal and verify:

```
node --version   # e.g. v20.11.0
npm --version    # e.g. 10.2.4
```

### Step 2 — Get the project

```
git clone <repository-url>
cd CAPSLOCK
```

Or extract the ZIP archive and `cd` into the directory.

### Step 3 — Install dependencies

```
npm install
```

**Corporate network / proxy notes**

If npm reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (self-signed corporate CA), run:

```
NODE_OPTIONS="--use-system-ca" npm install
```

If npm lacks write access to its default cache directory, redirect it to your user profile first:

```
npm config set cache "%USERPROFILE%\npm-cache"
npm config set prefix "%USERPROFILE%\npm-global"
```

The first install downloads ~300-400 packages including the Electron binary (~100 MB). This may take a few minutes depending on connection speed.

### Step 4 — Launch

```
npm start
```

Signs of a successful launch:

- A CAPSLOCK icon appears in the system tray
- The terminal prints `[hook] mode=DIRECT(CapsLock)  keycode=0x3a` confirming the keyboard hook is active
- If a Windows Firewall prompt appears, click **Allow access**

### All scripts

| Command | Description |
|---|---|
| `npm start` | Launch the app (normal mode) |
| `npm run dev` | Launch with Node.js inspector on port 5858 (attach Chrome DevTools) |
| `npm run build` | Package into a Windows NSIS installer (.exe), output in `dist/` |

---

## Usage

1. Double-click the tray icon (or right-click it and choose Show / Hide) to open the configurator
2. Click **+ Add Profile** to create an app-specific profile
3. In **App Matcher**, enter the target process name (e.g. `Code.exe`) or a window title fragment
4. In **Caps Lock Action**, pick a mapping type:
   - **Single Key** — type a key name (`escape`, `f5`, `tab`, `a`, …) or click Record Key
   - **Combo** — click **Record Keys**, then **hold** modifier keys (Ctrl / Shift / Alt / Win) and press the target key; release all keys
   - **Macro** — add ordered steps: keydown, keyup, type text, or insert a delay in milliseconds
5. Click **Save Profile**
6. Switch to the target application and press Caps Lock to trigger the action

### Enabling full Caps Lock suppression

If a yellow warning bar appears on first launch, the Caps Lock LED is still toggling on each press.
Click **Enable full suppression (restart required)** — the app writes a scancode map to the Windows registry that redirects the physical Caps Lock key to F13 at the driver level, eliminating LED flicker entirely.
**A system restart is required** for the change to take effect.

---

## Project Structure

```
CAPSLOCK/
├── src/
│   ├── main/
│   │   ├── index.js           # Main process entry, window creation
│   │   ├── preload.js         # contextBridge API exposed to renderer
│   │   ├── tray.js            # System tray and context menu (bilingual)
│   │   ├── hook.js            # Global keyboard hook (uiohook-napi)
│   │   ├── window-detector.js # Foreground window detection (koffi + Win32)
│   │   ├── key-simulator.js   # Keystroke injection (SendInput via koffi)
│   │   ├── profile-manager.js # Profile load/save (electron-store)
│   │   ├── ipc-handlers.js    # All IPC channel registrations
│   │   └── registry.js        # Registry scancode map (Caps Lock -> F13)
│   ├── renderer/
│   │   ├── index.html         # Configurator UI entry point
│   │   ├── renderer.js        # Main render logic and i18n wiring
│   │   ├── styles.css         # Global styles (dark theme, CJK fonts)
│   │   ├── i18n.js            # EN/ZH translation module
│   │   └── components/
│   │       ├── ProfileList.js   # Left sidebar profile list
│   │       ├── ProfileEditor.js # Profile settings panel
│   │       └── MappingEditor.js # Mapping editor (key / combo / macro)
│   └── shared/
│       └── constants.js       # IPC channel names, keycode maps
├── assets/
│   └── tray-icon.ico
├── electron-builder.config.js
├── package.json
└── README.md
```

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `uiohook-napi` v1.5.4 | Global keyboard hook (WH_KEYBOARD_LL) via N-API stable ABI; no native rebuild required |
| `koffi` v2.15.1 | Win32 FFI for SendInput, GetForegroundWindow, GetModuleFileNameExW |
| `electron-store` v8 | Atomic config persistence at `%APPDATA%\CAPSLOCK\config.json` |
| `electron` v28.3.0 | App framework |
| `electron-builder` | NSIS installer packaging |

---

## Config File Format

Settings are stored at `%APPDATA%\CAPSLOCK\config.json`:

```json
{
  "version": 1,
  "enabled": true,
  "profiles": [
    {
      "id": "default",
      "name": "Default",
      "matcher": null,
      "mapping": { "type": "key", "key": "escape" }
    },
    {
      "id": "vscode",
      "name": "VS Code",
      "matcher": {
        "processName": "Code.exe",
        "processNameMatchType": "exact",
        "windowTitle": null,
        "windowTitleMatchType": "contains"
      },
      "mapping": { "type": "combo", "keys": ["ctrl", "shift", "p"] }
    },
    {
      "id": "macro1",
      "name": "Macro example",
      "matcher": { "processName": "notepad.exe", "processNameMatchType": "contains" },
      "mapping": {
        "type": "macro",
        "sequence": [
          { "type": "type", "text": "Hello, World!" },
          { "type": "delay", "ms": 200 },
          { "type": "keydown", "key": "enter" },
          { "type": "keyup",  "key": "enter" }
        ]
      }
    }
  ]
}
```

---

## Troubleshooting

**Caps Lock does nothing**
Check the tray right-click menu — if you see "Enable Remapping", click it to re-enable. If the app runs without elevation it cannot intercept keystrokes directed at administrator-privileged windows (e.g. Task Manager); run the app as Administrator to fix this.

**Combo recording only captures one key**
Fixed in the current version. Hold your modifier keys (Ctrl / Shift / Alt / Win) first, then press the target key. Modifier-only keypresses are silently skipped and do not end the recording session — only a non-modifier keypress completes the combo capture.

**`npm install` fails with SSL error**
Corporate proxy issue. Run `NODE_OPTIONS="--use-system-ca" npm install`.

**App crashes on startup: `Cannot read properties of undefined (reading 'requestSingleInstanceLock')`**
The environment variable `ELECTRON_RUN_AS_NODE=1` is set, causing Electron to behave as plain Node.js so `require('electron')` returns a path string instead of the module. The `npm start` script already includes `env -u ELECTRON_RUN_AS_NODE` to strip this. If running manually, unset it first: `unset ELECTRON_RUN_AS_NODE`.

---

## License

MIT
