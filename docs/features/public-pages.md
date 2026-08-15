# Feature: Public Teacher & Course Pages

## Purpose
Marketing/discovery surface: `/teachers/[slug]` and `/courses/[slug]`.

## Data exposure rules
A dedicated `publicRepository` (read-only, no Admin-privileged fields)
returns only: teacher display name/bio/avatar for `isPublic == true`
profiles, and course title/description/thumbnail for
`status == "published"` courses. Never returns student data, quiz
content, files, or draft courses — this is enforced at the repository
query level, not by filtering after the fact.

## i18n / RTL
Public pages are fully localized and indexable per-locale
(`/en/teachers/x`, `/ar/teachers/x`), each with correct `dir` and
`hreflang` alternates for SEO.
