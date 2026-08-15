# Typography

## Font families

| Locale | Font | Notes |
|---|---|---|
| English (`en`) | Inter (variable) | clean, highly legible UI font |
| Arabic (`ar`) | IBM Plex Sans Arabic (variable) | designed for UI use, good x-height, pairs well with Inter's proportions |

Both loaded via `next/font` (self-hosted, no external request at
runtime), swapped via a CSS variable (`--font-sans`) set per-locale in the
root layout — components never hardcode a font family.

Implementation note (TASK-203): fonts are self-hosted via the
`@fontsource-variable/inter` and `@fontsource/ibm-plex-sans-arabic` npm
packages (imported in `app/[locale]/layout.tsx`) rather than
`next/font/google`, since the latter fetches from Google's font CDN at
build time — unavailable in network-restricted build environments. The
result is equivalent: fonts are bundled at build time and served from
`/_next/static`, with zero runtime requests to any font CDN.

## Scale (Tailwind theme tokens)

| Token | Size | Usage |
|---|---|---|
| `text-xs` | 12px | captions, metadata |
| `text-sm` | 14px | secondary text, form hints |
| `text-base` | 16px | body text |
| `text-lg` | 18px | emphasized body, card titles |
| `text-xl` | 20px | section headings |
| `text-2xl` | 24px | page headings |
| `text-3xl` | 30px | dashboard hero stats, landing headings |

## Line height & Arabic considerations

Arabic text uses a slightly larger `line-height` (1.6–1.7 vs 1.5 for
Latin) to accommodate diacritics and descenders; controlled via
`:lang(ar)` CSS selector rather than per-component overrides.

## Numerals

Numbers (prices, stats, dates) are rendered using Western Arabic numerals
(`0-9`) in both locales for consistency across the dashboard (a common,
deliberate convention in bilingual edtech products), documented here as
an explicit design decision (see `decisions/0002-numeral-system.md`).
