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
bun run typecheck
bun test
bun run build
bun run build:firefox
```

## Expanded translation view

Use the **expand icon** beside the voice, copy, and clear controls to open the existing
reader overlay on the current webpage with the current text and completed
translation. It uses the same reader as selected-text translation, including copy,
read-aloud, search and alternatives. Pending requests complete in the overlay.
Pasted text and page selections support up to 15,000 characters.

In **Settings → Interaction → Expanded view layout**, choose **Top and bottom** or
**Side by side**. The existing page-coverage setting applies to the reader.
Reader headers also offer layout switches for the current view without changing
the saved preference.
Narrow readers stack the panels automatically without changing the saved choice.

Expanded readers include **linked scrolling**, enabled by default. The chain
button toggles proportional scrolling between the two panels; it follows reading
progress rather than matching individual sentences.

Use **Find in both panels** (or Ctrl/Cmd+F while focused in the reader) to highlight
literal, case-insensitive matches. Enter/Shift+Enter and the arrow buttons cycle
through matches across both panels. Escape clears the search first; another
Escape collapses the page overlay. Search temporarily shows a read-only text
preview, including plain source text for Markdown results. Clearing it restores
the normal reader without changing the text or requesting a translation.

Select a translated word or phrase (up to 500 characters) and choose **Show
alternatives** in the expanded reader. Click a word or drag across words in the translated panel. The configured
AI provider returns up to three suggestions with brief definitions or explanations
in the app language. Copy a suggestion to use it; the translation stays unchanged.
This feature works independently of the Rewrite and Explain switches and follows
the provider fallback preference. It sends only the selected phrase and up to
1,500 characters of nearby translated context, plus your configured glossary.
Suggestions are not saved to history or cache. Changing the selection or either
text panel clears them; Escape closes suggestions before clearing search or
collapsing the overlay. The full translation limit remains 15,000 characters.

The toolbar sends text directly to the current page's content script and closes
only after the reader acknowledges the request. No new tab or page is opened.
On restricted pages (such as Firefox settings and the add-ons store), disabled
sites, or pages needing a reload after installing the extension, the toolbar
keeps the draft and shows an error. Completed translations are reused without
another provider request or history entry.

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
