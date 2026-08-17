# Notifications

## Purpose

A single `notifications/{notificationId}` collection (see
`docs/database/collections.md`) covers three distinct notification
types, all addressed to a `recipientId` and read via the same
`(recipientId, createdAt desc)` shape:

- `meeting_link` (Phase 6, TASK-1602) — a student is told their
  teacher's class is starting, with a join link.
- `class_reminder` (Phase 20, TASK-2003) — a teacher is reminded
  their own class starts soon.
- `audit` (Phase 30, TASK-3003) — a generic "something you care about
  changed" trail entry, any role.

`meeting_link`/`class_reminder` are documented in depth in
`schedule.md` (they're both schedule-derived and share
`classNotificationsJob`/`notificationService.sendMeetingLink`). This
file focuses on `audit`.

## User stories

- As a teacher, when I create, edit, or delete a course or lesson, I
  get a confirmation entry in my notification trail.
- As a student or teacher, when an enrollment or payment happens on
  either side, both parties get notified.
- As any signed-in user, I can open a notification with a link and
  land on the relevant page; one without a link just marks itself
  read.

## Data

`audit` notifications add `action` (`created`/`updated`/`deleted`),
`entityType`, `entityId`, and a server-generated `title: { en, ar }`
(rendered directly, not a `next-intl` key — the entity/action space is
too open-ended to enumerate as translation keys) on top of the shared
`recipientId`/`type`/`link`/`read`/`createdAt` fields. See
`docs/database/collections.md` for the full field table.

## Centralized write path

`lib/server/services/auditNotificationService.ts` is the single entry
point every mutating service calls — `notify({ action, entityType,
entityId, title, recipientIds, link? })` — rather than each service
hand-writing its own `notificationRepository.createMany` call. It:

- Dedupes `recipientIds`.
- Writes one doc per recipient via `notificationRepository.createMany`.
- Best-effort dispatches push (`pushDispatchService.dispatchForNotifications`)
  on top, same as `meeting_link`/`class_reminder`.
- Never throws — a notification failure must never fail the mutation
  it's reporting on.

### Coverage (this task)

| Entity | Action | Recipients | Link |
|---|---|---|---|
| Course | created / updated / deleted | acting teacher | `/teacher/courses/{id}` (absent on delete) |
| Lesson | created / updated / deleted | acting teacher | `/teacher/courses/{courseId}` (absent on delete) |
| Enrollment | created | student + teacher | `/student/courses/{courseId}` |
| Payment | created | student + teacher | none — no dedicated payments page exists for either role today (payments surface inline on the teacher dashboard's `PaymentsQueue` and the student's course list), so this degrades to mark-as-read-only |
| Payment | confirmed / rejected / succeeded | student | none, same reason as above |

Deliberately not yet wired (left for a follow-up task, same as
TASK-3004/3005's own dependency notes): exams, subscriptions, and user
accounts, and course `publish`/`unpublish` transitions specifically —
the task description's "courses, lessons, exams, enrollments,
payments, subscriptions, user accounts, etc." is intentionally
open-ended; this pass covers the four most-mutated entities so the
centralized helper and its UI exist, without hand-adding all ~40
possible call sites in one go. TASK-3004 (Admin notified on course
publish) and TASK-3005 (class-reminder acknowledge/expiry) are their
own separate tasks and remain `Not Started`.

## Authorization

Same as every other notification type: server-created only (never a
client-facing create path), a user reads/marks-read only their own
(`recipientId == auth.uid`), an Admin may read any. See
`docs/database/collections.md`'s `notifications` section and
`firestore.rules`.

## UI

`components/layout/audit-notifications-panel.tsx` — a role-agnostic
panel (unlike `MeetingNotifications`/`ClassReminderBanner`, which stay
scoped to their own dedicated types) mounted on all three dashboards
(`teacher/dashboard`, `student/dashboard`, `admin/dashboard`). Polls
`GET /api/notifications/mine` every 45s, same pattern as
`MeetingNotifications`; `PATCH /api/notifications/mine/{id}` marks one
read. Clicking a row with a `link` navigates and marks read in one
action (TASK-3002 behavior, reused); a row without a `link` just marks
read.

## i18n / RTL

`title.en`/`title.ar` are chosen by the panel based on `useLocale()`.
The panel itself uses `layout.auditNotifications.title`/`.new` (both
`en.json`/`ar.json`) for its own chrome. Uses the same logical
start/end (`ps-`/`pe-`, flex-based) layout primitives as
`MeetingNotifications`, so it mirrors correctly under RTL with no
special-casing.

## Edge cases

- A recipient with no `audit` notifications sees nothing (the panel
  returns `null`), same as `MeetingNotifications`.
- Duplicate recipient ids (e.g. a student paying for their own
  teacher's course, however unlikely) are deduped to one doc per
  actual mutation — see `auditNotificationService.notify`.
- A push failure, or the notification write itself failing, never
  fails the underlying mutation (course/lesson/enrollment/payment
  write) it's reporting on.

## `class_reminder` acknowledge & expiry (TASK-3005)

A teacher can mark a `class_reminder` "noted" (`acknowledged: true`,
via `ClassReminderBanner`'s "Dismiss" button →
`PATCH /api/teacher/notifications/{id}/acknowledge`), which is
independent of `read` — opening/navigating a reminder already marks it
`read`, but the teacher may still want it to keep nudging them until
they explicitly dismiss it.

Separately, a reminder auto-expires once its class's start time has
passed. No stored start-time or sweep job is needed: a `class_reminder`
always fires exactly `REMINDER_MINUTES_BEFORE` (10) minutes before the
slot's `startTime` (see `classNotificationsJob.ts`), so
`notificationRepository.listByTeacherRecipient` simply excludes any
reminder where `createdAt + REMINDER_MINUTES_BEFORE minutes <= now`
at read time — the doc itself is never deleted, it just stops being
returned. Both acknowledged and expired reminders disappear from
`ClassReminderBanner` on the next 45s poll (or page load).
