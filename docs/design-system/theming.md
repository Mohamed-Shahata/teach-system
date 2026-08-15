# Theme System (Light / Dark)

## Mechanism

- Theme is applied via a `data-theme="light" | "dark"` attribute on
  `<html>`, driving the CSS variables in `colors.md`.
- No `prefers-color-scheme`-only approach: user choice is explicit and
  persisted (system default is only the *initial* value).
- Persistence: an `HttpOnly=false`, `SameSite=Lax` cookie `theme` (not
  `localStorage`) so the **server** can read it during SSR and render the
  correct `data-theme` on the very first response — avoiding a
  flash-of-wrong-theme.
- A small inline script in `<head>` (before hydration) is **not**
  required because the theme is resolved server-side from the cookie;
  this keeps the architecture simpler and avoids hydration mismatches.

## Provider

```tsx
// components/theme/theme-provider.tsx (client)
// Reads initial theme from a server-provided prop (from the cookie),
// exposes { theme, setTheme } via context, and writes the cookie +
// updates the `data-theme` attribute when the user toggles it.
```

## Rules for components

- Never hardcode `bg-white`, `bg-black`, `text-gray-900`, etc. Always use
  semantic tokens (`bg-surface`, `text-foreground`, ...).
- Any component review must visually check both themes before being
  marked done (Definition of Done).
- Images/illustrations with a transparent background must be checked in
  both themes for contrast (e.g. dark-outlined icons disappearing on dark
  backgrounds) — prefer `currentColor` SVGs over raster icons where
  possible.
