# Feature: Student Management

## Purpose
Let Admins and Teachers create student accounts, and give Teachers
visibility into their own students across courses.

## User stories
- As an Admin, I can create a student account (email, name, education
  stage) and optionally see/manage every student in the center.
- As a Teacher, I can create a student account directly from my
  dashboard and optionally enroll them in one of my courses right away
  (useful for a student who paid cash/in person).
- As a teacher, I can see a list of my students (derived from
  enrollments in my courses), their enrolled courses, progress, and quiz
  results.

## Data
Account creation writes `users/{uid}` (`role: "student"`, `stageId`,
`createdBy`). The "my students" list is a derived view over
`enrollments` + `users` filtered by `enrollments.teacherId ==
session.uid`. No separate `students` collection — a student is a
`users` document with `role == "student"`.

## Authorization
- A Teacher may create student accounts, but may only see/enroll
  students **they created or who are enrolled in their own courses** —
  never a global student list across other teachers.
- An Admin may see and manage every student in the center.

## "Teachers" directory (Phase 23, restructured by TASK-3203)
The reverse direction — a student's view of the system's teachers —
originally landed per `docs/tasks/phase-23-student-teachers-
directory.md` as an enrollment-derived "My teachers" list. TASK-3203
(Phase 32) restructured it into a **"Teachers"** page (nav label
renamed; same `student/teachers` route — no path changed, so no
redirect was needed) with two tabs: **All teachers** (every
`isPublic == true` teacher in the system — `teacherDirectoryService
.listTeacherDirectory`) and **My Teachers** (the same list filtered
client-side to teachers the student has an `active` `subscriptions`
doc with, Phase 29 — not enrollment-based anymore).

Clicking a teacher, from either tab, opens their account view
(`student/teachers/[teacherId]`, `teacherDirectoryService
.getTeacherAccountView`) — no longer gated on the student having a
prior enrollment with that teacher. It shows the TASK-3101 profile
fields (headline, bio, years of experience, specialization, social
links) alongside the teacher's published courses (each flagged
`enrolled` for the caller), and — only for a subscribed/enrolled
student — the review form (Phase 27). Course *content* access
gating for a non-enrolled/non-subscribed student viewing this page
is TASK-3204's scope, not this one.

## Student self-service "My Profile" (TASK-3201, Phase 32)
A lightweight profile page (`student/profile`, distinct from
`student/settings`'s account page — display name/avatar/password) lets
a student view/edit `displayName`, an avatar, and a new
`users.birthDate` field (ISO `YYYY-MM-DD`), and see their own
`stageId` (grade level) read-only.

- `birthDate` was chosen over a raw `age` number specifically so the
  displayed age doesn't go stale: `age` is derived server-side from
  `birthDate` at read time (`lib/validation/user.schema.ts`'s
  `computeAgeFromBirthDate`, reused by `studentProfileService`) and is
  never itself persisted. This differs from the older, Admin/teacher-set
  `users.age` field (`account.schema.ts`), which is left as-is.
- `stageId` is shown but not editable here — changing grade level stays
  an Admin-only action (Student management "Edit"), to keep
  enrollment/subscription data consistent with the stage a student was
  actually enrolled under.
- Avatar upload is **not** duplicated on this page's API surface — it
  reuses TASK-1005's existing signed-upload flow and
  `PATCH /api/student/settings/avatar` (same Cloudinary field as the
  account-settings picture); only `displayName`/`birthDate` go through
  the new `GET`/`PATCH /api/student/profile`
  (`studentProfileService.getMyProfile`/`updateMyProfile`).
- The dashboard topbar's profile-icon link (TASK-3103 introduced this
  for teachers) now also routes a student session to `/student/profile`
  instead of `/student/settings`.
