# Phase 8 — Course Management

## TASK-801: Course repository & service
- Description: `courseRepository` (Firestore CRUD scoped by `teacherId`), `courseService` (slug generation/uniqueness, publish/unpublish, stats counter updates).
- Dependencies: TASK-602
- Status: Done

> Note: added `courseRepository` with teacher-scoped listing and
> ownership-checked update/delete, plus `courseService` for teacher-only
> create/update/publish/unpublish/delete. Slugs are generated from the
> English title and enforced unique per teacher. Course creation/deletion
> updates `teacherProfiles.stats.totalCourses`; publish/unpublish and
> deleting an already-published course update
> `stats.totalPublishedCourses`. Validation lives in
> `lib/validation/course.schema.ts`, and unit tests cover slug conflicts,
> role gates, not-found handling, and stats counter transitions.

## TASK-802: Course API routes
- Description: `/api/courses`, `/api/courses/[courseId]` per `api/README.md`.
- Dependencies: TASK-801, TASK-501
- Status: Done

> Note: added `GET/POST /api/courses` (list/create) and
> `GET/PATCH/DELETE /api/courses/[courseId]` (fetch one, update, delete),
> all thin route handlers that just verify the session, validate with
> `lib/validation/course.schema.ts`, and delegate to `courseService`, per
> `api/README.md`. Added `courseService.getCourse` for the single-course
> fetch (ownership-checked via `assertWritableByTeacher`, same rule as
> writes). `PATCH` accepts either a `{ status }` body — routed to
> `publishCourse`/`unpublishCourse` so the publish toggle keeps
> `stats.totalPublishedCourses` in sync — or a regular field-update body
> via `updateCourse`; the two aren't mixed in one request. Unit tests
> cover both route files plus the new `getCourse` service method.

## TASK-803: Course list & form UI
- Description: Teacher-facing course list, create/edit form (bilingual title/description, category, thumbnail upload), publish toggle.
- Dependencies: TASK-802, TASK-204
- Status: Not Started

## TASK-804: Course Security Rules
- Description: Extend `firestore.rules` for `courses` per `firebase/README.md`.
- Dependencies: TASK-601, TASK-801
- Status: Not Started
