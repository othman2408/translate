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

## Local HTML Pages

The selection bubble, translation, rewrite, and explain actions also work on HTML
files opened with `file:///`, subject to your browser's file-access permission.

In Chrome or Edge, open the extensions manager, choose this extension's **Details**,
enable **Allow access to file URLs**, then refresh any open local HTML pages.
In Firefox, check the extension's local-file access permission if access is blocked.
The toolbar shows a permission message when local-file access is unavailable;
manual text entry remains available.

The **Local files** toggle controls all local files together. It does not change
website preferences or store filenames or paths. Only the text you submit is sent
to the configured translation or AI provider, not the file's path or surrounding
content. Browser PDF viewers and other restricted browser pages are not supported.

## Checks

```powershell
bunx tsc --noEmit
bun test
bun run build
bun run build:firefox
```

## Localization

App UI messages live in `lib/locales/en/messages.json` and
`lib/locales/ar/messages.json`. The English catalog defines the TypeScript message
keys; Arabic must implement the same keys.

`public/_locales/` contains only browser-managed extension names, descriptions,
and keyboard-command labels. These follow the browser language independently of
the app's language setting. Keep those five messages consistent with the app
catalogs; the locale tests check this.

## AI Model Discovery

Provider editors automatically load public model catalogs before an API key is
entered: Models.dev (`https://models.dev/api.json`) for DeepSeek and Moonshot/Kimi,
and OpenRouter's own models endpoint for OpenRouter. These requests contain no API
keys, selected text, prompts, page URLs, or filenames.

Catalogs are cached in background memory for 15 minutes and concurrent requests
share a fetch. **Refresh models** reloads the public catalog. **Check models with
API key** queries only the configured provider using the current saved or draft
key; draft keys are not saved by discovery. Failed requests leave the current list
and selected model intact. Custom model IDs remain available because public
catalogs may lag releases or omit account-specific models.
