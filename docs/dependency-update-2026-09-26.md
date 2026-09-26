# Dependency review — 26 September 2026

Updated all outdated direct dependencies to the registry's latest stable releases,
retaining caret ranges and refreshing `bun.lock` with Bun 1.4.2. React, React DOM,
their types, Base UI, React Markdown, TypeScript, WXT and its React module were
already current. No prereleases or overrides were added.

## Direct upgrades and adoption decisions

| Package | Previous → current | Relevant changes and decision |
| --- | --- | --- |
| `ai` | 7.0.97 → 7.0.116 | Stream/error handling, telemetry cleanup, safer URL downloads and ES2022 compilation. Adds experimental evaluations and realtime capabilities. Existing `streamText`, `result.stream`, text deltas and `APICallError` remain compatible; keep the current text-only integration. [Changelog](https://github.com/vercel/ai/blob/main/packages/ai/CHANGELOG.md). |
| `@ai-sdk/deepseek` | 3.0.42 → 3.0.54 | Reasoning-stream fixes, `deepseek-flash` alias handling, typed errors for missing choices and tool-result images, plus shared provider updates. Custom model IDs remain supported. [Changelog](https://github.com/vercel/ai/blob/main/packages/deepseek/CHANGELOG.md). |
| `@ai-sdk/moonshotai` | 3.0.48 → 3.0.58 | Reasoning-stream fix and shared provider/schema utility updates. No application API migration required. [Changelog](https://github.com/vercel/ai/blob/main/packages/moonshotai/CHANGELOG.md). |
| `@openrouter/ai-sdk-provider` | 3.0.0 → 3.1.0 | Adds `evaluationModel()` for the Decisions API, requiring AI SDK ≥7.0.103 when used. Text generation remains compatible. Evaluations are unrelated to selected-text actions, so no new endpoint or permission is needed. [Changelog](https://github.com/OpenRouterTeam/ai-sdk-provider/blob/main/CHANGELOG.md). |
| `motion` | 13.2.0 → 13.4.4 | Animation performance improvements and `AnimatePresence` reentry fixes apply automatically. Adds Motion Editor hooks and `AnimateView` for React 19.3. Retain existing presence/variant transitions; adopting view transitions would be a separate UX change. [Changelog](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md). |
| `lucide-react` | 1.44.0 → 1.48.0 | Additional icons, icon artwork corrections and exported icon-node data. Existing imports compile; no icon substitutions needed. [Releases](https://github.com/lucide-icons/lucide/releases). |
| `vite` | 8.3.0 → 8.3.1 | Dependency optimizer, config merge, watcher and source-map fixes, with Rolldown dependency updates. Existing WXT Vite configuration remains supported. [Release](https://github.com/vitejs/vite/releases/tag/v8.3.1). |
| `web-ext` | 10.6.0 → 10.7.0 | Firefox 157 lint schemas, reload/config-path fixes and dependency updates. [Release](https://github.com/mozilla/web-ext/releases/tag/10.7.0). |

## Transitive changes that deserved extra attention

- **Zod 3.25.76 → 4.6.5:** the AI packages accept Zod 4 through their peer ranges.
  Make it an explicit dependency because the application now configures it.
  `lib/ai/schema-runtime.ts` enables `jitless` before provider schema construction,
  avoiding dynamic-code generation and its CSP probe in browser extensions. The
  provider modules import this setup before SDK imports. No application schemas
  needed migration. See [Zod migration guide](https://zod.dev/v4/changelog) and the
  [upstream CSP guidance](https://github.com/colinhacks/zod/issues/4461).
- **`@webext-core/isolated-element` 1.1.5 → 3.0.0:** WXT explicitly accepts this
  major. Version 2 replaces the internal HTML/body structure with a div; version 3
  removes CommonJS and renames standalone IIFE files. Our overlay mounts into the
  supplied WXT container, uses class/host selectors and ESM, and does not depend on
  that old structure or standalone bundle. [Release history](https://github.com/aklinker1/webext-core/releases).
- **`@wxt-dev/browser` 0.1.42 → 0.3.0:** WXT permits the newer version. Inspected
  the installed runtime selector and verified the application's browser API calls
  through type checking and both builds; no standalone changelog was found at the
  upstream package path. [Package source](https://github.com/wxt-dev/wxt/tree/main/packages/browser).
- **`@wxt-dev/storage` 1.2.8 → 1.2.9:** locking/dependency internals changed; no
  settings-key or data migration needed. [Changelog](https://github.com/wxt-dev/wxt/blob/main/packages/storage/CHANGELOG.md).
- **`@vitejs/plugin-react` 6.0.2 → 6.1.1:** refresh/compiler-filter fixes and an
  optional experimental native React Compiler. Keep WXT's existing React setup;
  enabling the experimental compiler would require separate evaluation.
  [Changelog](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md).

Other transitive packages were resolved within their owners' allowed ranges;
newer incompatible majors were not forced. All existing direct dependencies have
application or build-tool uses, so none were removed. Added `typecheck` and `test`
scripts and updated the README check command.

## Validation

- `bun install --frozen-lockfile`: succeeds without lock changes.
- `bun outdated`: no outdated direct dependencies.
- `bun run typecheck`: passes.
- `bun test`: 31 passing tests, including six new real-SDK integration tests with
  simulated HTTP responses for DeepSeek, Kimi and OpenRouter. These verify request
  serialization, custom model IDs, streamed output, authentication error mapping
  and zero calls to the Function constructor during provider execution.
- Chrome MV3 and Firefox MV2 production builds: pass.
- `bun audit`: no reported vulnerabilities.
- Firefox `web-ext lint`: zero errors, nine warnings in bundled dependency code
  (DOM writes and a static Function-constructor detection). Interpreter mode
  prevents the Zod call at runtime but does not remove the unreachable probe from
  the bundle, so the static warning remains.

Both builds also warn about the approximately 741 kB popup/shared chunk exceeding
the existing 700 kB threshold. No threshold was raised to hide it. Bundle splitting
is a separate optimization, not required for API compatibility.

Live authenticated provider calls and interactive browser UI smoke tests were not
performed. The simulated provider tests do not establish live service availability
or verify extension installation/UI behavior.
