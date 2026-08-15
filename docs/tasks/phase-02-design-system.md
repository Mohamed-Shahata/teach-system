# Phase 2 — Design System

## TASK-201: Implement color tokens & Tailwind theme
- Description: Wire the tokens from `design-system/colors.md` into Tailwind v4 `@theme` + CSS variables for both light and dark.
- Goal: `bg-background`, `text-foreground`, `bg-primary`, etc. usable across the app.
- Dependencies: TASK-102
- Affected modules: `app/globals.css`, Tailwind config
- Acceptance criteria: all tokens present; automated contrast check passes.
- Testing requirements: `scripts/check-contrast.ts`
- Documentation requirements: none (already documented)
- Status: Not Started

## TASK-202: Theme provider (light/dark)
- Description: Implement `ThemeProvider`, cookie-based persistence, server-rendered `data-theme`, per `design-system/theming.md`.
- Goal: No flash-of-wrong-theme; toggle works and persists.
- Dependencies: TASK-201
- Affected modules: `components/theme/*`, `app/[locale]/layout.tsx`
- Acceptance criteria: theme persists across reload and matches SSR output.
- Testing requirements: manual check in both themes; unit test for cookie parsing
- Status: Not Started

## TASK-203: Typography setup
- Description: Load Inter + IBM Plex Sans Arabic via `next/font`, wire `--font-sans` per locale, implement `:lang(ar)` line-height rule.
- Goal: Correct fonts per locale with no external runtime font requests.
- Dependencies: TASK-102
- Affected modules: `app/[locale]/layout.tsx`, `app/globals.css`
- Acceptance criteria: matches `design-system/typography.md`
- Status: Not Started

## TASK-204: Build core UI primitives
- Description: Implement the components listed in `design-system/components.md` (Button, Input, Select, Checkbox, Radio, Switch, Dialog, Dropdown, Tooltip, Card, Badge, Alert, Table, Pagination, Tabs, Breadcrumb, Skeleton, Empty/Loading/Error states).
- Goal: Full reusable primitive kit in `components/ui/*`.
- Dependencies: TASK-201, TASK-202
- Affected modules: `components/ui/*`
- Acceptance criteria: each primitive passes the checklist in `design-system/README.md` (tokens, both themes, both directions, responsive, AA contrast, visible focus).
- Testing requirements: Storybook or equivalent visual check per component; RTL/LTR + light/dark snapshot each
- Documentation requirements: fill in `docs/components/README.md` entries as built
- Status: Not Started
