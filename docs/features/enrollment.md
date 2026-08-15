# Feature: Enrollment

## Purpose
Track which students are taking which courses and their progress.

## User stories
- As a student, I can enroll in a free course (MVP: free only).
- As a student, I can see my progress (completed lessons / total).

## Data
`enrollments/{enrollmentId}` — see `database/collections.md`.
`enrollmentType` on the course is already modeled as
`free | paid | subscription` so payment flows can be added later without
a schema migration — MVP only implements `free`.

## Authorization
A student can only read/update their own enrollment/progress. A teacher
can read (not write) progress for enrollments where
`enrollment.teacherId == session.uid`.
