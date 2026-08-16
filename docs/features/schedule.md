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
