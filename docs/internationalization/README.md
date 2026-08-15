# Internationalization Architecture

## Library

`next-intl`, integrated with the App Router via a `[locale]` dynamic
segment.

## Locale strategy

```text
app/
  [locale]/
    layout.tsx        (reads params.locale, sets <html lang dir>)
    page.tsx
    (protected)/...
    (public)/...
messages/
  en.json
  ar.json
```

- Supported locales: `en`, `ar`. Default: `en` (configurable).
- Locale is part of the URL (`/en/dashboard`, `/ar/dashboard`) — no
  cookie-only locale switching, so pages are shareable/bookmarkable and
  crawlable per-locale.
- `middleware.ts` (using `next-intl`'s middleware, composed with the auth
  middleware) resolves the locale from the URL, falling back to
  `Accept-Language` only on the root `/` redirect.
- A logged-in user's `users/{uid}.locale` preference is used to redirect
  `/` → `/{locale}` on first visit; afterwards the URL is authoritative.

## Translation file structure

Namespaced JSON, mirroring feature areas:

```json
// messages/en.json
{
  "common": { "save": "Save", "cancel": "Cancel" },
  "auth": { "login": { "title": "Log in", "emailLabel": "Email" } },
  "course": {
    "createdSuccessfully": "Course created successfully",
    "form": { "titleLabel": "Title" }
  },
  "validation": { "required": "This field is required" }
}
```

```json
// messages/ar.json
{
  "common": { "save": "حفظ", "cancel": "إلغاء" },
  "auth": { "login": { "title": "تسجيل الدخول", "emailLabel": "البريد الإلكتروني" } },
  "course": {
    "createdSuccessfully": "تم إنشاء الكورس بنجاح",
    "form": { "titleLabel": "العنوان" }
  },
  "validation": { "required": "هذا الحقل مطلوب" }
}
```

Rule: **every** new user-facing string is added to both files in the same
commit; a lint/CI check (`scripts/check-translations.ts`, Phase 3 task)
fails the build if keys are missing in either file.

## Usage pattern

```tsx
// Server Component
import { getTranslations } from "next-intl/server";
const t = await getTranslations("course");
<h1>{t("form.titleLabel")}</h1>

// Client Component
import { useTranslations } from "next-intl";
const t = useTranslations("course");
toast.success(t("createdSuccessfully"));
```

Never: `toast.success("Course created successfully")` or any hardcoded
user-facing string, per the project's Strict Language Rule.

## Date / number / currency formatting

Use `next-intl`'s `useFormatter()` / `getFormatter()` (wraps
`Intl.DateTimeFormat` / `Intl.NumberFormat`) so formatting automatically
follows the active locale (e.g. Arabic-Indic vs Western digits per
locale settings, Gregorian calendar for both locales in the MVP).

## Pluralization

Handled via ICU MessageFormat syntax supported natively by `next-intl`,
e.g.:

```json
"studentsCount": "{count, plural, =0 {No students} one {# student} other {# students}}"
```

## Adding a third language later

1. Add `messages/xx.json` with the same key structure (CI check enforces
   parity automatically).
2. Add the locale code to the `locales` array in `i18n/config.ts`.
3. No component changes required — this is the extensibility guarantee
   this architecture provides.
