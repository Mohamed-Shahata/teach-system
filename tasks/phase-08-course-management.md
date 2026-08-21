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
- Status: Done

> Note: added `CourseManager` (`components/teacher/course-manager.tsx`),
> rendered from the (now real) `/teacher/courses` page, which fetches
> `courseService.listCourses` server-side and hands it off as
> `initialCourses`. Mirrors the `ScheduleManager` pattern from Phase 7:
> a `Table` list with a `Switch` publish/unpublish toggle and edit/delete
> row actions, a `Dialog`-based create/edit form (bilingual title via two
> `Input`s, bilingual description via the new `Textarea` component,
> subject/stage IDs as free-text — same convention as
> `ScheduleManager`, since there's no subject/stage entity yet),
> enrollment type `Select` with a conditional price `Input`, and a second
> `Dialog` for delete confirmation. A 409 response (slug conflict) shows
> a specific translated message instead of the generic save error.
> Thumbnail upload uses the real signed Cloudinary flow from
> `decisions/0004-signed-uploads.md` / `cloudinary/README.md`: a new
> `/api/uploads/sign` route (`uploadService.signUpload`) authorizes the
> teacher and resolves/signs a Cloudinary folder server-side —
> `teachers/{teacherId}/courses/{courseId}/thumbnail` when editing an
> existing course (ownership re-checked via `courseService.getCourse`),
> or a per-teacher `.../courses/_pending/thumbnail` staging folder during
> the create flow, before the course has an id. `CLOUDINARY_API_SECRET`
> never reaches the client. The client-side `uploadImage()` helper
> (`lib/client/upload.ts`) calls that route, then POSTs the file straight
> to Cloudinary — no file bytes pass through our own server. The course
> form replaces the old plain-URL field with a file picker (image/* only,
> 5 MB client-side pre-check per `security/validation.md`), a preview
> thumbnail, and replace/remove actions. Added `teacherDashboard.courses.*`
> (including the new upload/thumbnail copy) to both `messages/en.json`
> and `messages/ar.json`. Uses only logical
> Tailwind utilities (already the norm in this codebase) so RTL/LTR and
> the existing light/dark theme tokens apply without extra work. No
> component-test convention exists yet in this repo (no
> `@testing-library` / jsdom setup, and `ScheduleManager` itself is
> untested), but the new server-side pieces (`lib/server/cloudinary.ts`,
> `uploadService`, `/api/uploads/sign`) do have unit tests, following the
> same mocking pattern as `courseService`/`route.test.ts`. Verified with
> `tsc --noEmit`, `eslint`, the full `vitest run` suite (116/116 passing),
> and `next build` (all green).

## TASK-804: Course Security Rules
- Description: Extend `firestore.rules` for `courses` per `firebase/README.md`.
- Dependencies: TASK-601, TASK-801
- Status: Done

> Note: the `courses` match block in `firestore.rules` already
> implements this exactly per the spec in `firebase/README.md` — public
> read for `status == 'published'`, owner-only read/write otherwise via
> `isOwner(resource.data.teacherId)`, `create` requires `isTeacher()`
> with `request.resource.data.teacherId == request.auth.uid`, and
> `update`/`delete` additionally forbid reassigning `teacherId` to
> another teacher. Verified it matches the doc's reference rules 1:1 and
> is consistent with the server-side enforcement in `courseService`
> (`assertRole`, `assertWritableByTeacher`) — no rules change was needed,
> just confirming and closing out the task. As noted in
> `firebase/README.md`, the MVP routes all Firestore access through the
> Admin SDK server-side (bypassing rules), so there's no emulator-based
> rules test harness in this repo yet; these rules are the documented
> defense-in-depth layer, not the primary access path.
