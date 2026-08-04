# Translate

A selected-text translation browser extension built with WXT, React, TypeScript, Base UI, and Motion.

## Development

```powershell
bun install
bun run dev
```

WXT uses the project-scoped `.wxt/chromium-data` profile for Chromium development.
Provider keys and settings are stored by the extension in `browser.storage.local`, so
they persist between development sessions without being written to the repository.

Use `bun run dev:edge` for Edge or `bun run dev:firefox` for Firefox.
Marketplace screenshots and promotional artwork live in `store-assets/` and are not
included in extension builds.

## Checks

```powershell
bunx tsc --noEmit
bun run build
bun run build:firefox
```
