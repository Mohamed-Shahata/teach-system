# RTL / LTR Strategy

## Global switch

Direction is set once, at the root layout, from the resolved locale:

```tsx
// app/[locale]/layout.tsx
const dir = locale === "ar" ? "rtl" : "ltr";
return <html lang={locale} dir={dir}>...</html>;
```

Everything else follows from the browser's native `dir`-aware CSS
behavior plus disciplined use of **logical properties** — no
component-level `if (locale === "ar")` branching for layout.

## Rules

1. **Never use physical CSS properties for spacing/positioning** where a
   logical equivalent exists:
   - `margin-inline-start` / `margin-inline-end` instead of `margin-left`/`margin-right`
   - `padding-inline-start` / `padding-inline-end` instead of `padding-left`/`padding-right`
   - `inset-inline-start` / `inset-inline-end` instead of `left`/`right`
   - `text-align: start` / `end` instead of `left`/`right`
   - Tailwind: use the logical utilities (`ms-4`, `me-4`, `ps-4`, `pe-4`,
     `text-start`, `text-end`, `start-0`, `end-0`) — Tailwind v4's logical
     property utilities are enabled by default and used exclusively.
2. **Directional icons** (arrows, chevrons indicating "next/back",
   breadcrumb separators) are wrapped in a `<DirectionalIcon>` helper that
   mirrors them automatically via `transform: scaleX(-1)` when
   `dir=rtl`, driven by a CSS class tied to `[dir="rtl"] &`, not JS
   per-component checks.
3. **Non-directional icons** (search, trash, checkmarks, media icons) are
   never mirrored.
4. **Flex/grid layouts** use `flex-row`/`grid-flow-col` which are already
   direction-aware in CSS; avoid explicit `row-reverse` hacks for RTL.
5. **Sidebar/navigation** position (`start` side) is controlled by a
   single layout-level class, not duplicated per page.
6. **Tables**: header alignment uses `text-start`; numeric columns may
   still be forced `text-end` intentionally (numbers are typically kept
   LTR-shaped even in RTL UIs) — this is a deliberate design-system
   decision, documented in `design-system/typography.md`.
7. **Modals/dialogs/dropdowns**: use logical `inset-inline-*` for
   positioning; animation direction (slide-in) is driven by a CSS
   variable `--slide-from-edge: var(--start-edge)` resolved per direction.
8. **Charts** (if/when added): prefer chart libraries that support RTL
   natively, or mirror the container only, never the data.

## What is explicitly forbidden

- Ad-hoc `className={locale === "ar" ? "mr-4" : "ml-4"}` in individual
  components. If a case genuinely can't be solved with logical
  properties, it must be handled via a shared utility/hook
  (`useDirection()`) and documented as an exception here, not
  reinvented per component.

## Testing checklist per component (see `design-system/README.md`)

- [ ] Renders correctly with `dir="ltr"` and locale `en`
- [ ] Renders correctly with `dir="rtl"` and locale `ar`
- [ ] No visual overflow/clipping caused by longer Arabic strings
- [ ] Directional icons mirror; non-directional icons don't
- [ ] Focus order follows visual (reading) order in both directions
