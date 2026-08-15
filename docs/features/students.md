# Feature: Student Management

## Purpose
Give teachers visibility into their students across courses.

## User stories
- As a teacher, I can see a list of my students (derived from
  enrollments in my courses), their enrolled courses, progress, and quiz
  results.

## Data
Derived view over `enrollments` + `users` (student profile) filtered by
`enrollments.teacherId == session.uid`. No separate `students` collection
in the MVP — a student is a `users` document with `role == "student"`.

## Authorization
Teacher may only see students enrolled in **their own** courses — never
a global student list.
