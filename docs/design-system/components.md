# Component Catalogue

> Status: all primitives below are implemented in `components/ui/*`
> (TASK-204, Phase 2). Import from `components/ui` (barrel export).

Shared primitives, built once in `components/ui/*`, reused across all
features. Each entry lists the component, its states, and its i18n/RTL
notes. This is the checklist consulted before creating any new UI element
(per "No Duplicate Functionality").

| Component | States | i18n / RTL notes |
|---|---|---|
| Button | default, hover, active, disabled, loading | icon slot mirrors via `start`/`end` icon props, not left/right |
| Input | default, focus, error, disabled | error text below, `text-start` |
| Select | default, open, disabled | dropdown aligns to `start` edge of trigger |
| Checkbox / Radio | unchecked, checked, disabled | label uses `ms-2` (margin-inline-start) |
| Switch | on/off, disabled | thumb slides along inline axis (auto-correct in RTL) |
| Dialog / Modal | open/close, with/without footer actions | close button at `end` corner |
| Dropdown menu | open/close, item hover | opens toward available viewport space, respects `dir` |
| Table row actions (`TableActionsMenu`) | closed/open, item hover/focus, disabled item, destructive item | one kebab trigger per row instead of N standalone buttons; keyboard: Arrow Up/Down/Home/End navigate, Enter/Space select, Escape closes and returns focus to the trigger; menu opens from `inset-s-0` (start edge) |
| Tooltip | shown/hidden | positioned via logical placement (`start`/`end`, not `left`/`right`) |
| Card | default, interactive/hoverable | |
| Badge | neutral, success, warning, error, info | never color-only — includes icon or label |
| Alert / Banner | info, success, warning, error | |
| Table | default, empty, loading, with row actions | header `text-start`; numeric columns per `typography.md` |
| Pagination | default, disabled ends | prev/next icons mirror per `rtl-ltr.md` |
| Tabs | active/inactive | underline/indicator follows inline axis |
| Breadcrumb | | separator icon mirrors |
| Skeleton | | shape mirrors layout, no directional asymmetry |
| Empty state | with/without CTA | |
| Loading state | inline spinner, full-page loader | |
| Error state | inline, full-page (error boundary) | |

## Table row actions

Any table row that previously exposed more than one standalone action
button (edit, delete, view, confirm, reject, ...) uses
`TableActionsMenu` (`components/ui/table-actions-menu.tsx`) instead: one
kebab-icon trigger per row, opening a dropdown built from a config array
(`{ label, icon, onClick, variant, disabled? }[]`). `variant: "destructive"`
renders the item in the error color for actions like delete/reject.
Fully keyboard-operable (see table above) without any extra wiring per
table. See TASK-3501/3502 in `docs/tasks/phase-35-table-action-menus.md`.

## Composition rule

Feature components (e.g. `CourseCard`, `LessonList`) are built by
composing these primitives, not by re-implementing button/input/card
styles locally.
