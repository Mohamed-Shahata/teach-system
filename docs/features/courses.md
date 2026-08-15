# Feature: Course Management

## Purpose
Let a teacher create, edit, publish, and organize courses.

## User stories
- As a teacher, I can create a course for one of my subjects/stages,
  with a title/description in both languages so it renders correctly for
  any visitor's locale, and a price (courses are paid by default — see
  `features/payments.md`).
- As a teacher, I can upload a thumbnail via Cloudinary.
- As a teacher, I can reorder lessons within a course.
- As a teacher, I can publish/unpublish a course.

## Data
`courses/{courseId}` — see `database/collections.md`.

## Authorization
Only the owning teacher (`course.teacherId == session.uid`) may
create/edit/delete/publish. Students and other teachers get read access
only to `status == "published"` courses (enforced service-side and in
Security Rules).

## i18n / RTL
Title/description are localized maps (`{en, ar}`); the course form
renders two tabbed inputs (or side-by-side on desktop) — never a single
input reused for both languages.

## Edge cases
- Deleting a course cascades to its lessons and files (Cloudinary
  cleanup before Firestore delete, per `security/error-handling.md`).
- Slug collisions per teacher are rejected with `ConflictError`.
