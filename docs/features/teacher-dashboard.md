# Feature: Teacher Dashboard

## Purpose
Single overview screen for a teacher: total students, total courses,
published courses, total lessons, enrollments.

## Data
Stats are read from denormalized counters on `teacherProfiles.stats`
(updated by services on relevant writes, e.g. `createCourse` increments
`stats.totalCourses`) rather than recomputed via expensive aggregation
queries on every dashboard load.

## Scope discipline
Per project rules, the dashboard stays focused on the stats above —
no additional charts/widgets in the MVP.
