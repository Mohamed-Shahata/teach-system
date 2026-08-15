# Phase 14 — Public Pages

## TASK-1401: Public repository (read-only, restricted fields)
- Description: Per `features/public-pages.md` — returns only public-safe fields.
- Dependencies: TASK-801
- Status: Done

> Note: added `lib/server/repositories/publicRepository.ts`. Takes no
> `Session` (anonymous caller) and applies no `scopeToTeacher` — instead
> enforces exposure directly in the query/mapping: `findTeacherProfile`
> returns `{ teacherId, displayName }` only when `isPublic == true`
> (null otherwise), `listPublishedCoursesByTeacher` /
> `findPublishedCourseByTeacherAndSlug` only return `courses` docs with
> `status == "published"`, mapped to `{ id, teacherId, slug, title,
> description?, thumbnailUrl? }` — no student/quiz/file fields, matching
> `firestore.rules`' existing public-read conditions for both
> collections. `bio`/`avatarUrl` from `features/public-pages.md` aren't
> exposed because `TeacherProfileDoc` doesn't have those fields yet
> (only `teacherId`/`displayName`/`isPublic`/`stats`) — add them to the
> repo + this public projection together when TASK-1402 needs them.
> Unit tests in `publicRepository.test.ts` cover the public/non-public
> and published/not-found cases.

## TASK-1402: `/teachers/[slug]` public profile page
- Dependencies: TASK-1401, TASK-204
- Status: Done

> Note: `docs/database/collections.md`'s `teacherProfiles` schema already
> specified a required, globally-unique `slug` (plus optional `bio` /
> `avatarUrl`) that `teacherProfileRepository`/`accountService` hadn't
> implemented yet (only `teacherId`/`displayName`/`isPublic`/`stats`
> existed) — added those fields, `teacherProfileRepository.findBySlug`,
> and slug generation (`slugify(displayName)`, `-2`/`-3`... suffix on
> collision — global uniqueness, unlike a course's per-teacher slug) in
> `accountService.provisionAccount` for new teacher accounts, since the
> public page can't resolve a teacher without one. Added
> `publicRepository.findTeacherProfileBySlug` (same isPublic-only
> restriction as `findTeacherProfile`) and
> `lib/server/services/publicService.ts` (`getTeacherPageBySlug`,
> no `Session` — anonymous caller — throws `NotFoundError` for a
> missing/non-public slug, joins in `listPublishedCoursesByTeacher`).
> Page at `app/[locale]/(public)/teachers/[slug]/page.tsx` per
> `folder-structure.md`, calls `notFound()` on `NotFoundError`, shows
> avatar/displayName/bio + a course card grid (localized
> title/description picked by `next-intl` locale, same pattern as
> `student/dashboard/page.tsx`), `EmptyState` when no published courses.
> New `publicPages.teacherProfile` message namespace (en/ar). Existing
> teacher accounts created before this task have no `slug` and won't
> resolve on this page — acceptable for MVP (no teachers exist yet
> outside seed/dev data); a backfill script would be needed before
> going live with real pre-existing accounts. `next build` passes
> (route `/[locale]/teachers/[slug]` registered, no type errors);
> `publicRepository`/`publicService`/`teacherProfileRepository`/
> `accountService` unit tests updated/added (348 tests total, all
> passing).

## TASK-1403: `/courses/[slug]` public course page
- Dependencies: TASK-1401, TASK-204
- Status: Done

> Note: `courses.slug` is only guaranteed unique **per teacher**
> (`database/collections.md`), but this route is a flat `/courses/[slug]`
> with no teacher segment (`folder-structure.md`) — added
> `publicRepository.findPublishedCourseBySlug` as a global-by-slug query
> and documented the known (rare, unenforced) cross-teacher collision
> caveat on that method rather than changing `courseService`'s existing
> per-teacher slug uniqueness (Phase 8, Done, other things already
> depend on that scope). `publicService.getCoursePageBySlug` joins in
> the owning teacher's public profile via `findTeacherProfile` — throws
> `NotFoundError` only for a missing/unpublished course; a non-public
> teacher isn't an error, the course still renders, just without the
> "by {teacher}" link. Page at
> `app/[locale]/(public)/courses/[slug]/page.tsx`: thumbnail, localized
> title/description, and a link to `/teachers/[slug]` when the teacher
> is public. New `publicPages.coursePage` message namespace (en/ar).
> `next build` passes (route `/[locale]/courses/[slug]` registered);
> `publicRepository`/`publicService` tests updated/added (353 tests
> total, all passing).
