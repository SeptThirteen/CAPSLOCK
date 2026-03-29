# Project Guidelines

## Scope
- This is a Windows-only Electron app for Caps Lock remapping on x64.
- Prefer minimal, targeted edits and keep Main/Renderer/Shared boundaries clear.

## Architecture
- Main process code is in src/main (hook, key simulation, window detection, tray, IPC handlers).
- Renderer UI code is in src/renderer and src/renderer/components.
- Shared constants (IPC channels and keycode maps) are in src/shared/constants.js.
- Do not invent new IPC channel names inline. Add/update them in src/shared/constants.js first, then wire both ends.

See ARCHITECTURE.md for detailed module responsibilities and data flow.

## Build and Run
- Install dependencies: npm install
- Run app: npm start
- Debug run: npm run dev
- Build installer: npm run build

If npm start fails on Windows due to env -u in npm scripts, clear ELECTRON_RUN_AS_NODE in the current shell and run again.

## Conventions
- Keep IPC contract changes synchronized across:
  - src/shared/constants.js
  - src/main/ipc-handlers.js
  - src/main/preload.js
  - src/renderer/renderer.js (or component callers)
- For Caps Lock behavior changes, check both:
  - hook-based suppression in src/main/hook.js
  - registry remap flow exposed by src/main/registry.js and related IPC handlers
- Keep tray/background behavior intact:
  - Closing window hides to tray; app should continue running.
- Keep language support (zh/en) consistent when adding UI text:
  - update src/renderer/i18n.js and any tray labels triggered through LANG_SET.

## Native/Packaging Pitfalls
- Native modules uiohook-napi and koffi must remain unpacked in build artifacts.
- Keep asarUnpack entries in electron-builder.config.js when upgrading dependencies.
- Installer is configured with admin execution level; avoid changes that silently downgrade required privileges.

## Docs
- Use README.md for setup and user-facing behavior.
- Use ARCHITECTURE.md for deeper implementation details.
- Link these docs in responses instead of duplicating long sections.
