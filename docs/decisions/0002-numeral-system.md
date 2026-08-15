# ADR 0002: Numeral System in Arabic Locale

## Status
Accepted

## Context
Arabic locale could render numbers as Eastern Arabic-Indic numerals
(٠١٢٣) or Western Arabic numerals (0123).

## Decision
Use Western Arabic numerals (0-9) in both `en` and `ar` locales for
prices, stats, dates, and quiz scores, to keep dashboards and financial
figures unambiguous across the teacher/student audience.

## Consequences
Text content (labels, descriptions) is fully localized; numeric display
is a deliberate exception, documented in `design-system/typography.md`
so it isn't "fixed" inconsistently later.
