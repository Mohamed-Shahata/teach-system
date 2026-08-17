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

## "My teachers" (Phase 23)
The reverse direction — a student's own list of the teachers they're
enrolled with — landed per `docs/tasks/phase-23-student-teachers-
directory.md` (all three tasks `Done`): a derived `studentService`
listing (teachers a student has at least one non-cancelled enrollment
with), a `student/teachers` list page (+ sidebar nav entry), and a
per-teacher `student/teachers/[teacherId]` page scoped to that
student's own enrollment with the teacher (their courses, and — since
Phase 27 — the review form for that teacher).
