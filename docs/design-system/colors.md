# Color System

## Concept

Primary: a deep, trustworthy blue (evokes knowledge/focus, common in
credible edtech without being generic-startup-purple). Secondary/accent:
a calm teal, used sparingly for positive/progress states and highlights.
Neutrals: warm-tinted grays (not pure gray) to feel less clinical.

## Tokens (CSS variables, defined once, consumed via Tailwind theme)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-background` | `#F7F8FA` | `#0F1420` | page background |
| `--color-foreground` | `#111827` | `#E5E7EB` | primary text |
| `--color-surface` | `#FFFFFF` | `#161B29` | cards, panels |
| `--color-surface-muted` | `#F1F3F6` | `#1E2433` | subtle panels, table stripes |
| `--color-border` | `#E2E5EA` | `#2A3142` | borders, dividers |
| `--color-input` | `#E2E5EA` | `#2A3142` | input borders |
| `--color-primary` | `#1E4FD8` | `#5B84F5` | primary actions, links, active nav |
| `--color-primary-foreground` | `#FFFFFF` | `#0B1020` | text/icons on primary |
| `--color-secondary` | `#0F9E8E` | `#3FCBB8` | secondary emphasis, progress |
| `--color-secondary-foreground` | `#111827` | `#04211C` | text on secondary |
| `--color-accent` | `#EEF2FF` | `#1B2440` | subtle highlight backgrounds |
| `--color-success` | `#16A34A` | `#4ADE80` | success state |
| `--color-warning` | `#C86D05` | `#FBBF24` | warning state |
| `--color-error` | `#DC2626` | `#F87171` | error/destructive state |
| `--color-info` | `#2563EB` | `#60A5FA` | informational state |

## Usage rules

- Primary is reserved for the main call-to-action per screen and active
  navigation state — not for every button.
- Secondary/accent is used for progress indicators, "new"/positive
  badges, and highlighted stats.
- Semantic states (success/warning/error/info) are **never** the only
  signal — always paired with an icon and/or text label (accessibility
  rule 10).
- No more than 2 saturated colors visible in a single view besides
  semantic state colors.
- Dark mode avoids pure black (`#000`) backgrounds; light mode avoids
  pure white flooding every surface (background vs surface tokens are
  intentionally distinct).

## Contrast

All text/background token pairs above are chosen to meet WCAG AA
(≥4.5:1 for normal text, ≥3:1 for large text/UI components). Verified via
automated contrast check in `scripts/check-contrast.ts` (Phase 2 task).

Note: light-mode `secondary-foreground` and `warning` were adjusted from
their initial values during TASK-201 after the contrast check failed
(white text on `secondary` measured 3.33:1; the original `warning`
measured 2.99:1 against `background`) — both now pass with margin.
