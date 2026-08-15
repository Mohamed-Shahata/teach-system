# Coding Rules

## Clean code

- Single Responsibility Principle; one reason to change per module.
- Separation of concerns: UI ≠ business logic ≠ data access (see the
  layering in `architecture/overview.md`).
- Reusable components over copy-paste (`design-system/components.md`).
- Strong TypeScript typing; `any` requires a documented comment
  explaining why (rare — e.g. a genuinely untyped third-party callback).
- No `// @ts-ignore` to silence real type errors — fix the type.
- Clear, English-only naming everywhere in source code (see
  `development/language-rule.md`).
- Small, focused functions; extract when a function does more than one
  conceptual thing.
- Minimal duplication — search before creating (see below).
- Modular architecture with clear module boundaries (feature folders
  under `lib/server/{repositories,services}` and `app/`).

## Avoid

Huge components/service files, god objects, copy-pasted business logic,
scattered ad-hoc utilities, unnecessary abstraction layers, premature
optimization.

## No Duplicate Functionality

Before creating a component, hook, utility, service, repository,
validation schema, or type: search the existing project
(`components/ui`, `lib/hooks`, `lib/server/services`,
`lib/server/repositories`, `lib/validation`, `lib/types`). If an
equivalent exists, reuse or extend it instead of duplicating it.

## Extensibility rule

> Open for extension, closed for unnecessary modification.

When adding a feature, prefer adding a new module that plugs into
existing interfaces/services over editing many unrelated files. This does
**not** mean existing code is frozen — genuine refactors are done
properly, not hacked around.

## Git conventions

Conventional, meaningful commits:

```text
feat: add course management
fix: prevent unauthorized course access
refactor: simplify lesson service
docs: update authentication architecture
test: add enrollment validation
```

Avoid meaningless messages (`update`, `changes`, `fix`, `final`,
`final2`, `test`).

## Do not overengineer

No microservices, Kubernetes, complex event-driven systems, advanced
caching layers, or complex payment infrastructure unless a real,
documented requirement exists (`decisions/` records the justification
when introduced).
