# Phase 35 — Consolidated Table Action Menus

> Third post-MVP feature batch (user request, this session). Pure UI
> consistency work — no schema/API changes. Every data table across
> Admin/Teacher/Student views that currently renders multiple
> standalone action buttons in its last column gets a single "Actions"
> dropdown/menu button instead.

## TASK-3501: Shared `TableActionsMenu` component
- Description: A single reusable component (`components/ui/table-actions-menu.tsx` or similar) — one trigger button (an icon, e.g. kebab/three-dot) that opens a dropdown listing the row's available actions (edit, delete, view, confirm, reject, etc.), each item driven by a passed-in config array (`{ label, icon, onClick, variant, disabled? }[]`) so every table wires it the same way.
- Goal: Replace N one-off action-button implementations with one component, so future tables get consistent behavior for free.
- Dependencies: none (new shared component)
- Affected modules: `components/ui/table-actions-menu.tsx` (new), `docs/design-system` (document the pattern)
- Acceptance criteria: component supports a variable-length action list, disabled items, and destructive-action styling (e.g. delete in red); keyboard-accessible (opens/closes/navigates via keyboard, not just mouse).
- Testing requirements: component unit tests for rendering N actions, disabled state, and keyboard interaction.
- Documentation requirements: `docs/design-system` gets a "Table row actions" pattern entry.
- Status: Not Started

## TASK-3502: Migrate every existing data table to `TableActionsMenu`
- Description: Audit every table in the app with a multi-button action column (Admin teachers/students/courses/payments lists, Teacher's students/courses/lessons/exams lists, any others found during the audit) and replace each with TASK-3501's component. This is a mechanical pass, one PR/commit per table (or grouped by area) rather than one giant change, to keep review manageable.
- Dependencies: TASK-3501
- Affected modules: every `components/admin/*table*`, `components/teacher/*table*` (and equivalents) with a multi-action column — exact file list produced by the audit at implementation time
- Acceptance criteria: no table in the app has more than one standalone action button per row outside the `TableActionsMenu` trigger itself; behavior (which actions appear, when disabled) is unchanged from before the migration.
- Testing requirements: existing per-table tests updated to interact via the new menu instead of individual buttons; no regression in action availability/permissions per row.
- Documentation requirements: none beyond TASK-3501's pattern doc.
- Status: Not Started
