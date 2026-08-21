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
- Status: Done

> `TableActionsMenu` (`components/ui/table-actions-menu.tsx`) is a single
> kebab-icon trigger that opens a `role="menu"` dropdown built from a
> `{ label, icon, onClick, variant, disabled? }[]` config array (mirrors
> the existing `DropdownMenu`'s click-outside-to-close/`role="menuitem"`
> shape, extended with icon slots, disabled items, and a `destructive`
> variant that renders in `text-error`). Keyboard support: ArrowDown/Up
> from the trigger opens the menu at the first/last enabled item;
> ArrowDown/Up/Home/End move focus among enabled items only (disabled
> items are skipped, not just visually dimmed); Escape closes and
> returns focus to the trigger; Tab closes without stealing focus. The
> index math for "what's the next enabled item" is factored out into a
> pure, exported `nextActiveIndex()` function specifically so it has
> real unit-test coverage — this repo has no jsdom/testing-library setup
> (same gap noted in TASK-3102/3106), so a rendered-component test isn't
> possible here; `table-actions-menu.test.ts` covers empty/first/last/
> wrap-forward/wrap-backward/skip-disabled/start-from-unset cases (9
> tests). Exported from the `components/ui` barrel. Documented in
> `docs/design-system/components.md` (catalogue row + a new "Table row
> actions" section). TASK-3502 (migrate every existing table) is next —
> its only dependency, this task, is now `Done`.

## TASK-3502: Migrate every existing data table to `TableActionsMenu`
- Description: Audit every table in the app with a multi-button action column (Admin teachers/students/courses/payments lists, Teacher's students/courses/lessons/exams lists, any others found during the audit) and replace each with TASK-3501's component. This is a mechanical pass, one PR/commit per table (or grouped by area) rather than one giant change, to keep review manageable.
- Dependencies: TASK-3501
- Affected modules: every `components/admin/*table*`, `components/teacher/*table*` (and equivalents) with a multi-action column — exact file list produced by the audit at implementation time
- Acceptance criteria: no table in the app has more than one standalone action button per row outside the `TableActionsMenu` trigger itself; behavior (which actions appear, when disabled) is unchanged from before the migration.
- Testing requirements: existing per-table tests updated to interact via the new menu instead of individual buttons; no regression in action availability/permissions per row.
- Documentation requirements: none beyond TASK-3501's pattern doc.
- Status: Done

> Audit covered every file using the shared `Table` component's
> `rowActions` prop (12 files, `grep -rl "<Table" components`) — the
> only place a multi-button action column can exist, since `Table`
> (`components/ui/table.tsx`) is the app's one table primitive. Six had
> a genuine multi-button column and were migrated to `TableActionsMenu`:
> `admin/teacher-manager.tsx` (edit/view-profile/view-students/
> view-reviews/offerings/permissions-toggle/status-toggle — 7 actions,
> the `Link`s became `router.push` calls since `TableActionsMenu` items
> are `onClick`-only), `admin/student-manager.tsx` (view-profile/edit/
> subscriptions/status-toggle), `admin/center-config-manager.tsx` (both
> its stage and subject tables — edit/delete each),
> `admin/subscription-invoices-queue.tsx` (confirm/reject, per-item
> `loading` became `disabled` since the menu has no loading-item
> variant), and `teacher/course-manager.tsx` (manage-lessons/edit/
> delete — its `Switch` publish-toggle stayed outside the menu
> deliberately: a persistent status control, not a discrete action, same
> distinction as a `Badge`/status column). Six other `rowActions` sites
> already had only one button (`admin/reviews-panel.tsx` hide/unhide,
> `teacher/course-students-panel.tsx` view-breakdown,
> `teacher/teacher-files-manager.tsx` delete) or no `rowActions` at all
> (`admin/course-overview.tsx`, `admin/admin-payments-overview.tsx`,
> `teacher/exam-results-panel.tsx`, `teacher/student-list.tsx`) — left
> unchanged, since TASK-3501's component and this task's acceptance
> criteria both target *more than one* standalone action button.
> `student-manager.tsx`'s per-subscription `<li>` action row (generate
> invoice/pay cash/unsubscribe) was also left as-is: it's a list inside
> a dialog, not a `Table` row, out of this task's stated scope
> ("every table... with a multi-action column"). No behavior change —
> every action, its label, and its enabled/disabled condition carried
> over unchanged, just regrouped behind one trigger per row. No test
> files needed updating (no `.test.tsx` component tests exist in this
> repo, the same jsdom gap noted in TASK-3501/3102). Verification
> reviewed by hand this session (no `node_modules`/network in this
> sandbox): brace-balance and import-usage checked per edited file.
> **Phase 35 is now `Done`** — both of its tasks (TASK-3501–3502) are
> complete.
