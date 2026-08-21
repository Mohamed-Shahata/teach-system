# Phase 9 — Lesson Management

## TASK-901: Lesson repository & service
- Description: CRUD + reorder logic keeping `course.lessonOrder` and `lesson.order` in sync.
- Dependencies: TASK-801
- Status: Done

> Note: added `lessonRepository` (`lib/server/repositories/lessonRepository.ts`,
> `lessons` collection per `database/collections.md`) with
> `listByCourse` (sorted by `order`), `findById`,
> `create`/`update`/`delete` (ownership-checked via
> `assertWritableByTeacher`, same helper `courseRepository` uses), and a
> `reorder(orderedLessonIds, updatedAt)` that batch-writes every lesson's
> `order` field in one Firestore batch — the single-collection half of a
> reorder, since a repository only ever touches its own collection
> (`architecture/overview.md` layering rules).
>
> Added `lessonService` (`lib/server/services/lessonService.ts`) for the
> cross-collection orchestration: every method reuses
> `courseService.getCourse` for the role + ownership check (a lesson has
> no owner of its own — it's only ever reachable through its course, so
> this avoids duplicating the check per `coding-rules.md` "No Duplicate
> Functionality"). `createLesson` assigns the next `order` from the
> course's current `lessonOrder.length` and appends the new lesson id to
> `courses/{courseId}.lessonOrder` via `courseRepository.update`, then
> increments `teacherProfiles.stats.totalLessons`; `deleteLesson` does
> the mirror image (removes the id from `lessonOrder`, decrements the
> stat). `reorderLessons` validates the incoming id list is exactly the
> course's current lesson set (no missing/extra/duplicate ids — a
> `ValidationError` otherwise, rather than silently reconciling and
> risking an orphaned lesson), then calls `lessonRepository.reorder` and
> updates `lessonOrder` to match. These are two sequential repository
> calls, not a single cross-collection Firestore transaction — the same
> pattern `courseService.createCourse` already uses for its
> `teacherProfiles` stats update, so this stays consistent with the
> existing codebase rather than introducing transactions for the first
> time (`coding-rules.md` "Do not overengineer").
>
> The lesson's provider-agnostic `video` field
> (`{ provider: "cloudinary" | "youtube" | "external", url, publicId? }`)
> and validation live in the new `lib/validation/lesson.schema.ts`. While
> adding it, pulled the shared `{ en, ar }` localized-text building
> blocks (previously inlined only in `course.schema.ts`) out into
> `lib/validation/common.schema.ts` and had both schemas import from
> there, since a second schema needing the exact same shape is the
> "No Duplicate Functionality" trigger.
>
> Unit tests (`lessonService.test.ts`, 10 cases) mock the repositories
> and `courseService` the same way `courseService.test.ts` mocks
> `courseRepository` — covering ownership propagation, order assignment,
> `lessonOrder`/stats sync on create/delete, and all three reorder
> rejection cases (missing/extra/duplicate ids). No dedicated
> `lessonRepository` test file, matching the existing convention where
> `courseRepository`/`scheduleRepository` are only exercised indirectly
> through their service's tests. `tsc --noEmit`, `eslint`, and the full
> `vitest run` suite (126/126) all pass.

## TASK-902: Lesson API routes
- Dependencies: TASK-901, TASK-501
- Status: Done

> Note: added `GET/POST /api/courses/[courseId]/lessons` (list/create,
> per `api/README.md`) and `PATCH/DELETE /api/lessons/[lessonId]`
> (edit/delete), all thin route handlers per the same
> session-verify → Zod-validate → delegate-to-service convention as the
> course routes. Reordering (`lessonService.reorderLessons`) is exposed
> as `PATCH /api/courses/[courseId]/lessons` with a `{ lessonIds }` body
> — a course-scoped collection operation, not a single lesson's field
> update, so it stays off `/api/lessons/[lessonId]` and mirrors how the
> course `{ status }` publish toggle is a distinct body shape from a
> regular field update on the same route. `createLessonSchema` /
> `updateLessonSchema` / `reorderLessonsSchema` (already defined in
> `lib/validation/lesson.schema.ts` from TASK-901) are reused as-is; no
> new validation needed. Unit tests
> (`app/api/courses/[courseId]/lessons/route.test.ts`,
> `app/api/lessons/[lessonId]/route.test.ts`) mock `lessonService` the
> same way the course route tests mock `courseService`, covering
> list/create/reorder, the reorder-rejects-on-mismatched-id-set case,
> update/delete, 404 on a missing/unowned lesson, and 403 on an
> ownership error. `tsc --noEmit`, `eslint`, the full `vitest run` suite
> (135/135), and `next build` all pass.

## TASK-903: Lesson list (drag-and-drop reorder) & form UI
- Description: Includes provider-agnostic video field and file attachment.
- Dependencies: TASK-902, TASK-204
- Status: Done

> Note: added `LessonManager` (`components/teacher/lesson-manager.tsx`),
> rendered from a new `teacher/courses/[courseId]/page.tsx` (the course
> detail page named in `architecture/folder-structure.md`, not built by
> any earlier task) linked from a "Manage lessons" action added to
> `CourseManager`'s row actions. Mirrors the `CourseManager`
> list-plus-`Dialog`-form pattern: a draggable `<li>` list (native HTML5
> `draggable`/`onDragStart`/`onDragOver`/`onDrop`, no new dependency —
> `coding-rules.md` "Do not overengineer" and no drag-and-drop library
> already in `package.json`) showing each lesson's position, title, and
> video-provider badge, with edit/delete row actions; dropping a row
> reorders client-side immediately, then persists via
> `PATCH /api/courses/[courseId]/lessons` (`lessonService.reorderLessons`,
> TASK-902), reverting to the server's order via `refresh()` if that
> call fails. The create/edit `Dialog` form covers bilingual
> title/description (same two-`Input`/two-`Textarea` convention as
> `CourseManager`) plus the provider-agnostic video field as three
> inputs — provider `Select` (`youtube`/`cloudinary`/`external`), URL,
> optional public ID — matching `lessonVideoSchema`
> (`lib/validation/lesson.schema.ts`, TASK-901) exactly; empty
> provider/URL omits `video` from the request body entirely rather than
> sending a partial object.
>
> File attachment (`lesson.fileIds`) is **not** in this UI: Phase 13
> (File Management, `docs/tasks/phase-13-file-management.md`) — the
> file repository/service and `/api/uploads/sign` target for lesson
> files — hasn't started, so there's nothing yet to attach a file *to*.
> `fileIds` stays `[]` via `createLessonService`'s existing default;
> revisit this task's form once Phase 13 lands a `lesson-file` upload
> target, the same way `TASK-701`'s note explains why a "Lessons" nav
> link waited for a real destination. Cloudinary *video* upload is
> likewise out of scope here — `uploadService`/`uploadTargetSchema`
> only knows `course-thumbnail` (TASK-803) — so `provider: "cloudinary"`
> lessons are entered by pasting an already-known Cloudinary URL/public
> ID, not by uploading through this form.
>
> Added `teacherDashboard.lessons.*` and one new
> `teacherDashboard.courses.manageLessons` key to both `messages/en.json`
> and `messages/ar.json` (`scripts/check-translations.ts` confirms
> parity — 190 keys). Uses only logical Tailwind utilities, so
> `scripts/check-rtl-ltr.ts` passes unchanged; the drag list has no new
> color usage, so no contrast-check impact. No component-test
> convention exists for this repo's React components yet (same gap
> `TASK-803`'s note already covers — no `@testing-library`/jsdom setup),
> so `LessonManager`/the course detail page aren't unit-tested; the
> server-side pieces they call (`lessonService`, the two lesson routes)
> already have coverage from TASK-901/TASK-902. Verified with
> `tsc --noEmit`, `eslint`, the full `vitest run` suite (135/135
> unchanged — no new server code), and `next build` (all green, new
> `/[locale]/teacher/courses/[courseId]` route present).

## TASK-904: VideoPlayer component (multi-provider)
- Description: Renders Cloudinary/YouTube/external video based on `video.provider`.
- Dependencies: TASK-903
- Status: Done

> Note: added `VideoPlayer` (`components/lesson/video-player.tsx`), the
> single switch point on `video.provider` described in
> `docs/cloudinary/README.md` "Video handling" — callers pass the
> lesson's `video` field (`LessonVideoInput`, TASK-901) and never branch
> on provider themselves. `youtube` normalizes `watch?v=`, `youtu.be/`,
> `/shorts/`, and already-`/embed/` URLs to an embeddable
> `youtube.com/embed/{id}` iframe, falling back to a plain link if the
> URL doesn't parse as YouTube. `cloudinary` renders a native
> `<video>` with an adaptive-HLS `<source>` (`sp_auto` + `.m3u8`) plus an
> `f_auto,q_auto` progressive `<source>` fallback, built from `publicId`
> via a new `lib/cloudinary/url.ts` (`cloudinaryVideoStreamUrl` /
> `cloudinaryVideoUrl`) so no component hardcodes a Cloudinary URL,
> matching the pattern the docs describe for image delivery; if a
> Cloudinary lesson has no `publicId` (pasted URL only, since lesson
> video upload isn't wired yet per TASK-903's note), it falls back to
> `video.url` directly. `external` is a plain `<video src>` with a
> visible link inside as a `<video>`-unsupported fallback. Wired into
> `LessonManager` as a per-lesson "Preview" toggle (only shown when the
> lesson has a `video`) rather than always-rendered, since a course can
> have many lessons and eagerly mounting every `<iframe>`/`<video>`
> would be wasteful. Added `teacherDashboard.lessons.preview` /
> `hidePreview` to both message files (`check-translations.ts`: 192
> keys in sync). No component-test convention exists yet in this repo
> (same gap noted on TASK-803/TASK-903), so this is exercised
> indirectly via the existing `lessonService`/route tests that already
> cover the `video` field shape it consumes. `tsc --noEmit`, `eslint`
> (0 errors), `check-rtl-ltr.ts`, the full `vitest run` suite (135/135
> unchanged), and `next build` all pass.
