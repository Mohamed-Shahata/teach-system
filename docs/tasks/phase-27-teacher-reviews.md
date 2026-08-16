# Phase 27 — Student Reviews & Ratings for Teachers

> Added post-MVP, suggested alongside Phases 20–24. Public teacher
> pages (Phase 14) currently show bio/subjects/courses but no social
> proof. This phase lets an enrolled student leave a rating + short
> review for a teacher, shown on that teacher's public profile —
> gated to students who actually have (or had) an active enrollment
> with that teacher, to keep reviews credible.

## TASK-2701: `reviews` collection
- Description: `reviews/{reviewId}` — `teacherId`, `studentId`, `rating` (1–5), `comment`, `createdAt`. One review per `(teacherId, studentId)` pair (editable, not stackable) enforced at the service layer.
- Dependencies: TASK-1101 (enrollment, for eligibility check)
- Affected modules: `docs/database/collections.md`, `firestore.rules`, `firestore.indexes.json`
- Status: Not Started

## TASK-2702: Submit/edit review (student side)
- Description: On a teacher's public/detail page (as seen by a logged-in student), show a "Leave a review" form only if the student has an active or past enrollment with that teacher; submitting upserts their single review from TASK-2701.
- Dependencies: TASK-2701
- Affected modules: `components/student/teacher-review-form.tsx`
- Status: Not Started

## TASK-2703: Display reviews + average rating on public teacher page
- Description: Public teacher profile shows the average rating (computed on read or maintained as a denormalized `averageRating`/`reviewCount` on the teacher's profile doc, updated via a Firestore trigger or on write) and a paginated list of reviews with student first name + comment.
- Dependencies: TASK-2701
- Affected modules: `app/[locale]/teachers/[teacherId]/page.tsx`, `features/public-pages.md`
- Status: Not Started

## TASK-2704: Moderation hook
- Description: Give the Admin a way to hide/remove an individual review (e.g. abusive content) without deleting the underlying document — a `hidden: boolean` flag respected by TASK-2703's public read.
- Dependencies: TASK-2703
- Affected modules: `components/admin/reviews-panel.tsx`
- Status: Not Started
