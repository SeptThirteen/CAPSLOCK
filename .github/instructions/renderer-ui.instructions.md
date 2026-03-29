---
applyTo: "src/renderer/**"
description: "Use when editing renderer UI, renderer components, styles, and i18n text for the CAPSLOCK app."
---

# Renderer UI Instructions

## Scope
- Applies to renderer-side files under src/renderer.
- Keep edits focused on UI behavior and renderer state flow.

## Renderer Boundaries
- Treat renderer as untrusted UI code.
- Do not access Electron main APIs directly in renderer.
- Use the preload bridge API on window.capslock for all main-process interactions.
- If a new renderer action needs IPC:
  - add/update channel in src/shared/constants.js
  - wire it in src/main/preload.js
  - register handler in src/main/ipc-handlers.js
  - call it from renderer/component code

## UI and Components
- Follow the existing split:
  - renderer.js for app-level state and orchestration
  - components/ for focused UI editors and list views
- Keep component contracts explicit (props/callbacks), avoid hidden shared mutable state.
- Preserve tray-first app behavior in UI wording (closing window is not app exit).

## i18n Rules
- Every user-facing string must exist in both zh and en in src/renderer/i18n.js.
- Prefer translation keys over inline literals in renderer/component code.
- For static text in HTML, use data-i18n or data-i18n-placeholder and let applyI18n refresh.
- When language changes in UI, keep tray labels in sync through the existing LANG_SET flow.

## Styling and UX
- Reuse existing CSS tokens/variables and theme mechanism.
- Keep desktop readability first, but do not break narrower window sizes.
- Avoid introducing heavy UI frameworks unless explicitly requested.

## Validation and Safety
- Preserve profile validation and conflict visibility in UI flows.
- For import/export and destructive actions, keep explicit user confirmation.
- Do not silently swallow user-impacting failures; surface clear, localized messages.

## References
- See README.md for user-facing behavior and operation expectations.
- See ARCHITECTURE.md for module responsibilities and process boundaries.
