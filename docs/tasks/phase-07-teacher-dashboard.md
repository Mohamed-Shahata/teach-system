# Phase 7 — Teacher Dashboard

## TASK-701: Teacher dashboard layout & nav
- Description: Sidebar/nav for Overview, Courses, Lessons, Students, Exams, Files, Settings, per `features/teacher-dashboard.md` and `architecture/folder-structure.md`.
- Dependencies: TASK-406, TASK-204
- Status: Not Started

## TASK-702: Dashboard stats
- Description: Read denormalized `teacherProfiles.stats` and render overview cards (students, courses, published courses, lessons, enrollments).
- Dependencies: TASK-701
- Status: Not Started

## TASK-703: Weekly schedule management
- Description: `schedule` repository/service/API (`GET/POST/PATCH/DELETE /api/teacher/schedule`) + UI for a teacher to add/edit/delete their own recurring weekly class slots, per `features/schedule.md`.
- Dependencies: TASK-602, TASK-701
- Status: Not Started

## TASK-704: Pending manual payments queue
- Description: List of `pending` manual (`vodafone_cash`/`bank_transfer`) payments for the teacher's own courses, with confirm/reject actions, per `features/payments.md`.
- Dependencies: TASK-602, TASK-701, TASK-1104 (payments service)
- Status: Not Started
