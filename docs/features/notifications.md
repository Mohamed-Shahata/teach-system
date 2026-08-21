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
| SubscriptionInvoice | confirmed (TASK-3405) | student | `/student/dashboard` — covers both `subscriptionInvoiceService.confirmInvoice` (teacher/Admin manual review) and `manualSubscriptionPaymentService.recordCashPayment` (TASK-3402's one-action cash flow, which writes an already-`confirmed` invoice directly and so notifies outside its own transaction, best-effort, same as every other `auditNotificationService` call) |
| Subscription | renewal due (TASK-3405) | student | `/student/dashboard` — daily sweep, not a same-session mutation trigger; see below |
| Course | published, draft→published transition only (TASK-3004) | every Admin | `/admin/courses/{id}` (TASK-3306's admin course-detail page) |

`new_course` reuses the `audit` type/`action: "created"` shape (a
distinct `entityType` rather than a fifth `NotificationDoc.type`, same
reasoning as every other `auditNotificationService` caller) — fired
from `courseService.publishCourse` only when the course's prior status
wasn't already `published` (the same draft→published check that gates
the `totalPublishedCourses` counter), so republishing an
already-published course, or any other `updateCourse` edit, doesn't
re-notify. Recipients come from `userRepository.listByRole("admin")`,
read fresh on every publish (no cached admin list).

Deliberately not yet wired: exams, user accounts, and course
`unpublish` transitions specifically — the task description's
"courses, lessons, exams, enrollments, payments, subscriptions, user
accounts, etc." remains intentionally open-ended.

### Renewal-due sweep (TASK-3405)

Unlike every other row above — which fires inside the mutation that
causes it (confirming a payment, in the same request) — "renewal due"
has no single mutation to hook: it's a *lack* of one (the student
hasn't paid this month) becoming true as time passes. So it's a
scheduled sweep, not a same-session `auditNotificationService.notify`
call from a service method:

- `lib/server/services/subscriptionRenewalQuery.ts` — the shared "which
  active subscriptions have no confirmed invoice for the current
  period" query, factored out so TASK-3404's Admin-facing list and this
  sweep can never disagree on who's overdue. Also excludes subscriptions
  created within the current period, since a brand-new subscription
  needs a first invoice, not a renewal reminder.
- `lib/server/jobs/subscriptionRenewalNotificationsJob.ts` — the daily
  job (triggered by `app/api/cron/subscription-renewal-notifications/route.ts`,
  see `docs/deployment/vercel.md`'s cron section): for every subscription
  the query returns, sends the "renewal due" notification and then calls
  `subscriptionRepository.markRenewalNotified(id, period)`.
- **No-duplicate guard:** each `subscriptions/{id}` doc tracks
  `lastRenewalNotifiedPeriod` (`YYYY-MM`). The job skips any subscription
  whose `lastRenewalNotifiedPeriod` already equals the current period —
  so running the sweep more than once in a day, or every day for a
  month a student still hasn't paid, sends exactly one notification per
  overdue period, not one per run.

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
