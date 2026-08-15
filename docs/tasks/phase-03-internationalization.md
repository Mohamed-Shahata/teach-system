# Phase 3 — Internationalization

## TASK-301: next-intl setup & locale routing
- Description: Configure `[locale]` segment, `middleware.ts` locale resolution, `i18n/config.ts`, base `messages/en.json` + `messages/ar.json`.
- Goal: `/en/*` and `/ar/*` render with correct `lang`/`dir`.
- Dependencies: TASK-102
- Affected modules: `middleware.ts`, `i18n/*`, `app/[locale]/layout.tsx`
- Acceptance criteria: switching locale in the URL changes language and direction instantly.
- Testing requirements: e2e check for both locales
- Status: Not Started

## TASK-302: Translation parity CI check
- Description: `scripts/check-translations.ts` fails the build if `en.json`/`ar.json` keys diverge.
- Goal: Prevent missing-translation regressions.
- Dependencies: TASK-301
- Affected modules: `scripts/`, CI config
- Acceptance criteria: intentionally mismatched keys fail the script in a test run.
- Status: Not Started

## TASK-303: RTL/LTR logical-property audit tooling
- Description: Lint rule / grep-based check flags physical properties (`ml-`, `mr-`, `left-`, `right-`, `text-left`, `text-right`) in `components/**` in favor of logical equivalents, per `internationalization/rtl-ltr.md`.
- Goal: Prevent RTL regressions at the source.
- Dependencies: TASK-204
- Affected modules: ESLint config or custom script
- Status: Not Started

## TASK-304: Locale switcher component
- Description: Build the UI control to switch between `en`/`ar`, preserving the current path.
- Goal: Discoverable language switching from any page.
- Dependencies: TASK-301, TASK-204
- Affected modules: `components/layout/locale-switcher.tsx`
- Acceptance criteria: works from any route without losing route params.
- Status: Not Started
