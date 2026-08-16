# Phase 20 — Automated Class Notifications

> Builds on the `notifications` collection and `notificationService`
> already shipped in Phase 6 (`TASK-1602`, see `database/collections.md`
> and `features/schedule.md`). Today, sending a class's meeting link is a
> **manual** action — the teacher opens the schedule row and clicks
> "Send" once the slot is live. This phase makes two things automatic,
> on a timer, with no click required:
>
> 1. A **reminder to the teacher** shortly before their own class starts.
> 2. The **"class is starting" push to students** — currently the manual
>    `sendMeetingLink` action — firing itself the moment a slot's
>    `startTime` is reached, still scoped to "actively enrolled with this
>    teacher AND same `stageId`" (unchanged recipient rule).
>
> Needs a time-based trigger outside the request/response cycle — see
> TASK-2001 for the mechanism.

## TASK-2001: Scheduled trigger infrastructure
- Description: A recurring server-side trigger (Vercel Cron calling a protected `app/api/cron/*` route, per-minute) that the two notification jobs (TASK-2002, TASK-2003) hook into. Needs a shared secret check (`CRON_SECRET` env var, per `deployment/environment-variables.md`) so the route can't be invoked by anyone else.
- Dependencies: TASK-1602, TASK-1701 (deployment/Vercel)
- Affected modules: `vercel.json` (cron config), `app/api/cron/class-notifications/route.ts`, `lib/deployment/environment-variables.md`
- Status: Done — `vercel.json` schedules `/api/cron/class-notifications` every minute; the route checks `Authorization: Bearer <CRON_SECRET>` (fails closed with 401 if the header is missing/wrong or the env var isn't set) before calling `runClassNotificationsJob()` (new `lib/server/jobs/classNotificationsJob.ts`, currently a no-op placeholder returning `{ notified: 0 }`). `CRON_SECRET` added to `.env.example` and `docs/deployment/environment-variables.md`; `docs/deployment/vercel.md` documents the cron section and flags that Vercel's Hobby plan only runs crons daily regardless of `vercel.json`'s schedule — confirm the plan before relying on per-minute firing in production. TASK-2002/TASK-2003 fill in the actual notification logic inside the job function.

## TASK-2002: Automatic "class starting" push to students
- Description: Replace/extend the manual `notificationService.sendMeetingLink` trigger with an automatic one: every `schedule` slot whose `dayOfWeek`/`startTime` matches "now" (within the cron's polling window) and that has a `meetingUrl` set fires the same fan-out `sendMeetingLink` already does (same recipient rule: active enrollment with this teacher + `user.stageId === slot.stageId`). A slot fires **once** per occurrence — add a `lastNotifiedAt`/`lastNotifiedDate` marker on the `schedule` doc (or a lightweight per-occurrence dedupe key) so the per-minute cron doesn't re-send for the same class. The existing manual "Send" button in the teacher UI can stay as a manual override/backup, but the primary path is automatic from here.
- Dependencies: TASK-2001
- Affected modules: `lib/server/services/notificationService.ts`, `lib/server/repositories/scheduleRepository.ts`, `database/collections.md` (`schedule.lastNotifiedAt`)
- Status: Done — `lib/server/jobs/classNotificationsJob.ts` fetches every slot (`scheduleRepository.listAll`), filters to `dayOfWeek`/`startTime` matching the cron tick's "now" with a `meetingUrl` set and not yet notified today, then fans out the same `meeting_link` notification `sendMeetingLink` sends manually (active enrollment with the slot's teacher + matching `stageId`, via new unscoped `enrollmentRepository.listAllByTeacherId`). Dedupe via `schedule.lastNotifiedDate` (`YYYY-MM-DD`), written by `scheduleRepository.markNotifiedToday` even when zero students match, so an empty slot isn't re-scanned all day. The manual "Send" button (`ScheduleManager`) is untouched and still works as a backup. Full test coverage in `classNotificationsJob.test.ts`.

## TASK-2003: Teacher reminder before class starts
- Description: New notification type (`type: "class_reminder"`) sent to the **teacher** (not students) a configurable number of minutes before their own slot's `startTime` (default 10) — a nudge to set/check the `meetingUrl` before students start arriving. Reuses the same `notifications` collection with `studentId` generalized to a `recipientId` (or a parallel `teacherId`-addressed doc — pick one and document it in `collections.md`), same dedupe approach as TASK-2002.
- Dependencies: TASK-2001, TASK-2002
- Affected modules: `lib/server/services/notificationService.ts`, `database/collections.md` (`notifications.type` enum extended with `class_reminder`), `components/teacher/*` (small reminder banner/toast, reusing `meeting-notifications.tsx`'s polling pattern)
- Status: Done — chose the `recipientId` generalization (renamed `notifications.studentId` → `recipientId` everywhere: repository, service, `firestore.rules`, `firestore.indexes.json`, `collections.md`). `classNotificationsJob` fires a `class_reminder` notification to `slot.teacherId` when `startTime` is `REMINDER_MINUTES_BEFORE` (10, hardcoded for now) minutes out, regardless of whether `meetingUrl` is set yet — that's the point of the nudge. Dedupe via new `schedule.lastReminderDate`, tracked separately from `lastNotifiedDate` since the two fire at different offsets. `notificationService.listMyClassReminders` (teacher-only) and `markNotificationRead` (now also allows `teacher`, not just `student`/`admin`) back the teacher-facing read path.

## TASK-2004: Notification center polish
- Description: Now that notifications arrive automatically (not just after a manual click), the student's notification list (`meeting-notifications.tsx`) and a new teacher-facing equivalent need to poll/refresh more often, and should visually distinguish `meeting_link` (class starting) from `class_reminder`. Consider a small unread-count badge in `dashboard-topbar.tsx`.
- Dependencies: TASK-2002, TASK-2003
- Affected modules: `components/student/meeting-notifications.tsx`, `components/layout/dashboard-topbar.tsx`, `messages/en.json`, `messages/ar.json`
- Status: Done — polling (45s `setInterval`) added to both `meeting-notifications.tsx` and `class-reminder-banner.tsx`, replacing the once-on-load fetch. Added an unread-count bell to `dashboard-topbar.tsx` (`unreadCount` prop, hidden entirely when omitted so the admin layout — no notification concept — is unaffected), wired through `dashboard-shell.tsx` and computed server-side in `student/layout.tsx` (unread `meeting_link`) and `teacher/layout.tsx` (unread `class_reminder`). `messages/en.json`/`ar.json` got the `unreadNotifications` ICU-plural string plus the teacher's `classReminders` block from TASK-2003. Visual distinction between `meeting_link` and `class_reminder` wasn't needed beyond what already exists — each component's list is type-pure by construction (a student only ever sees `meeting_link`, a teacher only `class_reminder`), so there's no single list mixing both types to disambiguate within.
