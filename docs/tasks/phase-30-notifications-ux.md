# Phase 30 — Notifications UX & Delivery Coverage

> Third post-MVP feature batch (user request, this session). Builds on
> Phase 20's `notifications` collection + `classNotificationsJob` and
> Phase 26's FCM push delivery — no new top-level collection, this
> phase is about making the existing `notifications` collection
> mandatory-on, clickable, and triggered from more places (every
> create/update/delete, not just meeting links + class reminders).

## TASK-3001: Remove the student notification opt-in toggle
- Description: Students currently have an in-app-notifications on/off toggle in Settings. Remove the toggle and the underlying preference field — in-app notifications become always-on for students, the same way they already are for teachers/admins. Push (FCM) opt-in (Phase 26, per-device token registration) is a separate concern and is unaffected.
- Goal: A student can no longer be in a state where `notifications` docs are created for them but never surfaced in the UI.
- Dependencies: TASK-2001–2003 (notifications collection), Phase 26 (push, unaffected)
- Affected modules: `components/student/*settings*`, whatever `users`/settings doc field currently stores the toggle, `app/api/student/settings/*` (or equivalent), `lib/validation/*settings*.schema.ts`
- Acceptance criteria: no UI toggle remains; existing students with the preference stored `false` still see notifications after this ships; no route still reads/writes the removed field.
- Testing requirements: unit test confirming notification delivery is unconditional for students; regression check that the removed field isn't referenced anywhere else (`grep` sweep).
- Documentation requirements: update `docs/features/notifications.md` (or equivalent) to state in-app notifications are mandatory for all roles.
- Status: Done — implemented this session. Scope note: the only opt-in/out control that existed anywhere for students was the **push** (OS/browser) toggle in `StudentSettingsForm` (`push.title` card) — there was never a separate in-app-bell toggle to remove, the bell was already always-on. Removed `PATCH /api/student/settings/push`, `studentSettingsService.updatePushPreference`, and the `Switch` UI; `StudentProfile.pushEnabled` is now hardcoded `true`. `pushDispatchService` no longer honors a stored `pushEnabled: false` for `role === "student"` recipients (still honored for teacher/admin, whose toggle is untouched). On mount, `StudentSettingsForm` now silently calls `requestPushToken`/`syncPushToken` (previously-unwired Phase 26 helpers) so a student's device gets registered for push without an explicit action, best-effort/non-blocking. Updated: `lib/server/services/studentSettingsService.ts`, `lib/server/services/studentSettingsService.test.ts`, `lib/server/services/pushDispatchService.ts`, `lib/server/services/pushDispatchService.test.ts`, `components/student/student-settings-form.tsx`, `lib/validation/account.schema.ts` (doc comment only), `messages/en.json`/`messages/ar.json` (`studentDashboard.settings.push`: dropped `enableLabel`, added `alwaysOnDescription`). Deleted: `app/api/student/settings/push/route.ts` + its test.

## TASK-3002: Clickable notifications with deep links
- Description: The notification bell/dropdown currently marks-as-read but doesn't navigate anywhere. Add a `link` (relative path) field to `notifications` documents, populated per `type` at creation time (e.g. `meeting_link` → the schedule/course page, `new_course` (TASK-3004) → the course page, `class_reminder` → the teacher's schedule). Clicking a notification marks it read and navigates to `link` if present.
- Goal: Every notification is actionable, not just informational.
- Dependencies: TASK-2001–2003
- Affected modules: `docs/database/collections.md` (`notifications.link` field), `lib/server/services/notificationService.ts`, `lib/server/jobs/classNotificationsJob.ts` (or wherever it lives), notification bell UI component
- Acceptance criteria: every notification type produced by the system sets a valid `link`; clicking navigates and marks read in one action; notifications with no sensible target (if any) degrade to mark-as-read-only, not a broken link.
- Testing requirements: unit tests per notification type asserting `link` shape; a UI/interaction test for click → navigate + read.
- Documentation requirements: `docs/database/collections.md` `notifications` table gets the new `link` row; `docs/features/notifications.md` documents the click behavior.
- Status: Not Started

## TASK-3003: Generic audit notifications on create/update/delete
- Description: Every create, update, and delete performed through the service layer (courses, lessons, exams, enrollments, payments, subscriptions, user accounts, etc.) should emit a notification to the relevant recipient(s) — the acting user's own confirmation and, where relevant, the owning Admin/teacher. Centralize this rather than hand-adding calls per service: a single `auditNotify(action, entity, actor, recipients)` helper called from the shared service-layer write path (or from each service's existing success path) keeps this from being 40 one-off call sites.
- Goal: Nothing important changes in the system without a visible trail for the people who should know.
- Dependencies: TASK-2001–2003, TASK-3002 (so these are clickable too)
- Affected modules: new `lib/server/services/auditNotificationService.ts` (or similar), touches every `lib/server/services/*Service.ts` that performs a mutating write
- Acceptance criteria: creating/editing/deleting a course, lesson, exam, enrollment, payment/invoice, or user account produces a notification visible to the appropriate recipient(s); no duplicate notifications for a single logical action.
- Testing requirements: unit tests per service confirming the notification side-effect fires exactly once per mutation with the correct recipient set.
- Documentation requirements: `docs/features/notifications.md` gets a table of "action → recipient(s)".
- Status: Not Started

## TASK-3004: Admin notified when a teacher publishes a new course
- Description: A specific case of TASK-3003 called out separately by the user — when a teacher creates/publishes a course, every Admin gets a `new_course` notification linking to that course (feeds TASK-3306's "view course content" admin capability).
- Dependencies: TASK-3003, TASK-3306
- Affected modules: `lib/server/services/courseService.ts`
- Acceptance criteria: publishing a course creates one `new_course` notification per Admin account; draft→draft edits do not.
- Testing requirements: unit test on `courseService.publish` (or equivalent) asserting the notification fan-out.
- Documentation requirements: covered by TASK-3003's table entry.
- Status: Not Started

## TASK-3005: Teacher "upcoming class" notification — open, acknowledge, and auto-dismiss
- Description: Phase 20's `class_reminder` notification exists but is send-only. Extend it so a teacher can open it (TASK-3002 covers navigation), acknowledge/pin it ("noted"), and have it automatically clear once the class's scheduled time passes.
- Dependencies: TASK-2003 (class_reminder), TASK-3002
- Affected modules: `lib/server/jobs/classNotificationsJob.ts`, `lib/server/services/notificationService.ts`, teacher notification bell UI
- Acceptance criteria: a teacher can mark a class reminder acknowledged; acknowledged or expired (class start time passed) reminders no longer show as active/unread.
- Testing requirements: unit tests for the acknowledge action and for the expiry sweep.
- Documentation requirements: `docs/features/notifications.md`.
- Status: Not Started
