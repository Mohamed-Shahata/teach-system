# Feature: Weekly Schedule

## Purpose
Let each teacher publish their own fixed, recurring weekly class times
per subject/stage (e.g. "Physics — Grade 3 Secondary — Tue & Thu, 5:00
PM"), and let students/visitors browse the timetable.

## User stories
- As a teacher, I can add/edit/delete my own weekly schedule slots (day,
  time, duration, subject, stage, optional note).
- As a student, I can see the schedule for the stage/subjects I'm
  enrolled in (and, on public pages, the published schedule for any
  teacher).
- As an Admin, I can see and edit every teacher's schedule.

## Data
`schedule/{scheduleId}` — see `database/collections.md`. Slots are
recurring by `dayOfWeek`, not tied to a specific calendar date — there
is no "single occurrence" concept in the MVP (no cancel-one-instance
flow).

## Authorization
Only the owning teacher or Admin can create/edit/delete a schedule
entry. Students and public visitors get read-only access, scoped to
published/public teachers.

## Live meeting link (Phase 6)
A slot may carry an optional `meetingUrl` (Google Meet / Zoom). The
owning teacher can add/edit it from the schedule row once the slot is
"live" — from 15 minutes before `startTime` through the end of
`durationMinutes` — and can then send it to every actively-enrolled
student in *exactly* the slot's `stageId` (see `notifications` in
`database/collections.md`). This is a one-off push per click, not a
subscription — students who enroll after the link is sent don't get a
retroactive notification.

## i18n / RTL
Day-of-week labels and times must respect locale (Arabic day names) and
be direction-agnostic (a Tue/Thu badge row uses `flex` with logical
gap/margin properties, not hardcoded left/right).

## Automation (Phase 20)
The manual "send meeting link" click described above now has an
automated counterpart, per `docs/tasks/phase-20-notifications-
automation.md` (all tasks `Done`): a scheduled job auto-fires the
class-start notification to enrolled students, and a separate reminder
is pushed to the teacher shortly before their own class starts. The
manual click still works as a fallback/override — it wasn't removed,
just supplemented.

## Student weekly schedule (TASK-3205)
`GET /api/student/schedule` (`studentScheduleService.listMySchedule`)
returns every slot belonging to a teacher the caller holds an `active`
Phase 29 subscription with — the same "subscribed" definition
`teacherDirectoryService` already uses, not `enrollments`. Slots are
looked up via `scheduleRepository.listByTeacherIds` (chunked `in`
query, same pattern as `teacherProfileRepository.findByIds`) and
joined to the teacher's `displayName` and the subject's localized
`name` server-side, so the page needs no extra client-side lookups. A
student with no active subscriptions gets an empty list, not an error.
`student/schedule/page.tsx` renders this as a 7-column (day) timetable
— a read-only view, so unlike the teacher's `schedule-manager.tsx` it
stays a server component with no client state.

## Clickable notifications (TASK-3002)
Every `notifications` doc (both the manual send and the two automated
variants above) now carries a `link` — a relative in-app path set at
creation time. Clicking a notification row in `MeetingNotifications`
(student) or `ClassReminderBanner` (teacher) marks it read and navigates
there in one action: a `meeting_link` notification routes to the
student's page for that teacher (`/student/teachers/{teacherId}` — there's
no direct `courseId` on a schedule slot, so this is the closest available
"course page"); a `class_reminder` routes to the teacher's own dashboard,
where the schedule slot lives. The student's "Join" button and the
teacher's "Dismiss" button remain separate actions (open the meeting URL
directly / acknowledge without navigating, respectively) and don't
trigger the row-level navigation.
