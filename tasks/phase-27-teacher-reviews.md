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
- Status: Done

> `reviews/{teacherId}_{studentId}` documented in `collections.md`
> (`teacherId`, `studentId`, `rating` 1–5, `comment`, `hidden` default
> `false`, `createdAt`/`updatedAt`) — composite doc id enforces the
> one-review-per-pair rule the same way `enrollments`/`lessonProgress`
> enforce their own uniqueness pairs, so no extra service-layer check is
> needed for that part once TASK-2702 writes through it. Rules added: a
> student may create/edit only their own review (id format enforced, and
> `teacherId`/`studentId` immutable after creation) and can never set
> `hidden`; only Admin may flip `hidden` (TASK-2704); public read
> excludes any `hidden` review except to Admin or the reviewed teacher;
> no client delete. Eligibility (the student must have/had an enrollment
> with this teacher) is intentionally left to TASK-2702's server-side
> check, not these rules — noted in both `collections.md` and the rules
> file, since a cross-collection lookup isn't cheap to express here.
> `firestore.indexes.json` gets one new composite index,
> `(teacherId, hidden, createdAt desc)`, for TASK-2703's public
> newest-first reviews list. TASK-2702 (submit/edit review UI) remains
> `Not Started` and is next (its only dependency, this task, is now
> `Done`).

## TASK-2702: Submit/edit review (student side)
- Description: On a teacher's public/detail page (as seen by a logged-in student), show a "Leave a review" form only if the student has an active or past enrollment with that teacher; submitting upserts their single review from TASK-2701.
- Dependencies: TASK-2701
- Affected modules: `components/student/teacher-review-form.tsx`
- Status: Done

> Also added (implied infrastructure, not listed above since the task
> description only named the form component): `lib/validation
> /review.schema.ts` (`upsertReviewSchema`), `lib/server/repositories
> /reviewRepository.ts` (`findByTeacherAndStudent`/`listVisibleByTeacher`
> — the latter for TASK-2703/`upsert`, same composite-id pattern as
> `lessonProgressRepository`), `lib/server/services/reviewService.ts`
> (`assertEligible` — active/past, i.e. non-`cancelled`, enrollment with
> the teacher, derived from `enrollmentRepository.listByStudent` the same
> way `teacherDirectoryService` derives "my teachers", no new
> relationship collection; `getMyReview`/`upsertReview`), and
> `GET`/`PUT /api/teachers/[teacherId]/reviews/me`. `TeacherReviewForm`
> is mounted on `student/teachers/[teacherId]` (TASK-2303's page) rather
> than the anonymous `(public)/teachers/[slug]` page named generically in
> this phase's intro — that page has no session to attribute a review to,
> and the student-facing per-teacher page already only lists teachers the
> student has an enrollment with, so eligibility holds by construction
> there without a client-side re-check (the real gate stays server-side,
> `reviewService.assertEligible`). `hidden` is never accepted from this
> form/route — always defaulted from the existing doc or `false`, per
> TASK-2701's rules. TASK-2703 (public display + average rating) remains
> `Not Started` and is next (its only dependency, TASK-2701, is already
> `Done`).

## TASK-2703: Display reviews + average rating on public teacher page
- Description: Public teacher profile shows the average rating (computed on read or maintained as a denormalized `averageRating`/`reviewCount` on the teacher's profile doc, updated via a Firestore trigger or on write) and a paginated list of reviews with student first name + comment.
- Dependencies: TASK-2701
- Affected modules: `app/[locale]/teachers/[teacherId]/page.tsx`, `features/public-pages.md`
- Status: Done

> Scope note: the task names `app/[locale]/teachers/[teacherId]/page.tsx`,
> but the actual public teacher page (TASK-1402) is
> `app/[locale]/(public)/teachers/[slug]/page.tsx`, keyed by slug not id —
> that's the file updated here. Average rating computed on read
> (`reviewService.getPublicSummary`, called from `publicService.
> getTeacherPageBySlug`) rather than a denormalized `averageRating`/
> `reviewCount` field + trigger: `reviews` is small per teacher, this
> keeps the number always exactly consistent with what's actually
> publicly visible (no risk of a stale denormalized count if a trigger
> ever misfires), and adds no new write path to keep in sync — revisit
> if a teacher's review volume ever makes the extra read expensive.
> `reviewRepository.listVisibleByTeacher` capped at 50 (newest first);
> true pagination (a `?cursor=` param, `Pagination` component) deferred
> until a real teacher approaches that count — not needed for the MVP
> volume this phase targets. Each review shows the student's first name
> only (never full name/uid) — joined via `userRepository.findByIds`,
> same batch pattern as `studentService`'s roster joins. TASK-2704
> (moderation hook) remains `Not Started` and is next (its only
> dependency, this task, is now `Done`).

## TASK-2704: Moderation hook
- Description: Give the Admin a way to hide/remove an individual review (e.g. abusive content) without deleting the underlying document — a `hidden: boolean` flag respected by TASK-2703's public read.
- Dependencies: TASK-2703
- Affected modules: `components/admin/reviews-panel.tsx`
- Status: Done

> `reviewRepository.listAllByTeacher`/`setHidden` (new
> `(teacherId, createdAt desc)` index in `firestore.indexes.json`,
> separate from TASK-2703's `(teacherId, hidden, createdAt desc)` one —
> this admin query has no `hidden` filter, so it needs its own),
> `reviewService.listForModeration`/`setHidden` (both admin-only,
> `assertRole(session, "admin")`), `GET /api/admin/teachers/[teacherId]
> /reviews` + `PATCH /api/admin/reviews/[reviewId]` (`{ hidden }` only —
> rating/comment are never accepted here), and `ReviewsPanel` mounted on
> a new `admin/teachers/[teacherId]/reviews` page, linked from a
> "View reviews" row action on `TeacherManager` (mirrors TASK-2403's
> "View students" action/page shape). The underlying review document is
> never deleted by this flow, only its `hidden` flag flips, per this
> task's own description and the `firestore.rules` `allow delete: if
> false` already in place from TASK-2701. All four of this phase's tasks
> (TASK-2701–2704) are now `Done`.
