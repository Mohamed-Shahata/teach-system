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

## Preview (TASK-3104)
A "Preview as a student" link on the teacher's course editor page opens
`teacher/courses/{courseId}/preview`, which renders the course through
the exact same `CourseDetailView` component the student-facing course
detail page (TASK-3204) uses — same markup, same lesson-list shape.
Two things make it a *preview* rather than the real student view:
- `courseService.getCourseForPreview` is owner/Admin-gated
  (`assertWritableByTeacher`) instead of open, and — unlike
  `courseService.getCourse` — works regardless of `status`, so a
  `draft` course previews before it's ever published.
- `lessonService.listLessonsForCoursePreview` locks every lesson
  except `isFreePreview` ones, ignoring the teacher's own access,
  since the point is to see what a prospective (non-enrolled,
  non-subscribed) student would see — not what the owner can already
  reach. Viewing the page never changes `status`, never creates an
  enrollment, and nothing is persisted.

## Admin course view (TASK-3306)
From the Admin course overview table (TASK-2401), a "View" row action
opens `admin/courses/{courseId}` — a read-only view of any course,
reusing `CourseDetailView` again (the third consumer, after the
student and teacher-preview pages). No new service methods were
needed: `courseService.getCourseForStudent` and
`lessonService.listLessonsForCourseDetail` already special-cased an
`admin` session (added for TASK-3204) to bypass the enrollment/
subscription check entirely — every lesson resolves `locked: false`
for an Admin caller regardless of course `status`. No edit controls
are rendered on this page; editing an Admin-viewed course still
happens on the teacher-facing course editor. Out of scope for this
task: per-lesson video/file playback and the linked-exam view — the
page shows the lesson list (title/order/free-preview flag) the same
way the student/preview pages do, not an embedded player.
