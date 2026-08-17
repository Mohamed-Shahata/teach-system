# Feature: Student Reviews & Ratings for Teachers

## Purpose
Give public teacher pages (Phase 14) social proof: an enrolled
student can leave a 1–5 rating and a short comment for a teacher,
shown on that teacher's public profile. See
`docs/tasks/phase-27-teacher-reviews.md`.

## User stories
- As a student, I can leave (or later edit) a single review for a
  teacher I have — or previously had — a non-cancelled enrollment
  with.
- As a visitor or student browsing a teacher's public page, I can see
  their average rating and a list of recent reviews (student first
  name + comment).
- As an Admin, I can hide an individual review (e.g. abusive content)
  without deleting it, so it stops appearing publicly while still
  existing for record-keeping.

## Data
`reviews/{teacherId}_{studentId}` — see `database/collections.md`.
The composite doc id itself enforces one review per
`(teacherId, studentId)` pair (submitting again upserts the existing
review rather than creating a second one) — the same pattern
`enrollments`/`lessonProgress` use for their own uniqueness pairs.
Fields: `rating` (1–5), `comment`, `hidden` (default `false`),
`createdAt`/`updatedAt`.

## Eligibility
A student may only review a teacher they have (or had) a
non-`cancelled` enrollment with. This is checked server-side
(`reviewService.assertEligible`, derived from
`enrollmentRepository.listByStudent` — no separate relationship
collection, same approach `students.md`'s "My teachers" list uses) —
`firestore.rules` deliberately doesn't attempt this cross-collection
check itself, since it isn't cheap to express there.

## Where it's shown
- The review form is on the student-facing
  `student/teachers/[teacherId]` page (`features/students.md`'s "My
  teachers"), not the anonymous public teacher page — that page has no
  session to attribute a review to, and the student-facing page
  already only lists teachers the student has an enrollment with, so
  eligibility holds by construction there.
- The average rating + newest-first review list (capped at 50, no
  pagination yet — revisit if a teacher's volume ever approaches that)
  is computed on read (`reviewService.getPublicSummary`, not a
  denormalized counter) and rendered on the anonymous
  `(public)/teachers/[slug]` page (`features/public-pages.md`).
- Admin moderation is `admin/teachers/[teacherId]/reviews`
  (`ReviewsPanel`), linked from a "View reviews" row action on
  `TeacherManager` — mirrors the shape of `students.md`'s "View
  students" drill-down.

## Authorization
A student may create/edit only their own review (`teacherId`/
`studentId` immutable after creation) and can never set `hidden`.
Only Admin may flip `hidden` (`PATCH /api/admin/reviews/[reviewId]`,
`{ hidden }` only — rating/comment are never accepted there). Public
read excludes any `hidden` review except to Admin or the reviewed
teacher. No client delete — a hidden review is never removed, only
suppressed.

## Edge cases
- A review is never deleted by the moderation flow, only its `hidden`
  flag flips (`firestore.rules` has `allow delete: if false` on the
  collection).
- Rating/comment can't be edited through the moderation endpoint —
  Admin can only hide/unhide, never rewrite a student's content.
