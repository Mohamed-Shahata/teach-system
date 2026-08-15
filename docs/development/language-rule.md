# Strict Language Rule

The entire codebase is written in English: variables, functions,
components, files, folders, types, interfaces, enums, constants,
Firestore collection/field names, API responses, logs, console messages,
developer comments, internal error identifiers, and developer-facing
documentation.

**Arabic appears nowhere in source code**, except inside translation
files:

```text
messages/
├── en.json
└── ar.json
```

This applies even to code discussing Arabic-language features (e.g. RTL
handling) — the *code* stays in English; only the *content it renders*
may be Arabic, and only via the translation system (see
`internationalization/README.md`).
