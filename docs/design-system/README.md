# Design System

## Principles

Education-appropriate: trustworthy, calm, professional, focused. Avoid
generic "startup SaaS" gradients and neon accents. Should feel credible
enough for a teacher to present to students and parents.

## Contents

- `colors.md` — token palette, light & dark values, semantic usage
- `typography.md` — font families (incl. Arabic-friendly font), scale
- `theming.md` — how light/dark theme switching is implemented
- `components.md` — catalogue of reusable primitives

## Tech implementation

- Tailwind CSS v4 with `@theme` tokens mapped to CSS variables (so the
  same token name resolves differently per theme without duplicating
  Tailwind config).
- All components consume **semantic tokens** (`bg-background`,
  `text-foreground`, `border-border`, `bg-primary`, ...), never raw color
  values (`#1a2b3c`, `blue-600`, etc.) directly in feature components.
- A small internal UI kit lives in `components/ui/*` (button, input,
  select, dialog, card, badge, table, tabs, etc. — see
  `components.md`) built once and reused everywhere, so RTL, theming, and
  accessibility are solved centrally instead of per-feature.

## Verification checklist (Definition of Done, applied per component)

- [ ] Uses semantic color tokens only
- [ ] Works in light and dark mode
- [ ] Works in LTR and RTL
- [ ] Responsive from mobile → desktop
- [ ] Meets WCAG AA contrast for text and interactive elements
- [ ] Focus state visible via keyboard navigation
