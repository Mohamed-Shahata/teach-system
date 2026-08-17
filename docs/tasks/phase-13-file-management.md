# Phase 13 — File Management

## TASK-1301: Cloudinary signing endpoint
- Description: `/api/uploads/sign` per `cloudinary/README.md`, authorization-checked.
- Dependencies: TASK-104, TASK-501
- Status: Done

> Note: `POST /api/uploads/sign` + `uploadService.signUpload` already
> existed (from Phase 8's course-thumbnail work) but only supported the
> `course-thumbnail` target, so this task was left "Not Started" even
> though most of it was already built. Closed out by adding the
> `lesson-file` target: `uploadTargetSchema` gains `"lesson-file"`,
> `signUploadSchema` gains an optional `lessonId`, and
> `uploadService.resolveFolder` derives the Cloudinary folder
> (`teachers/{teacherId}/courses/{courseId}/lessons/{lessonId}/files`)
> from the lesson's own stored `courseId`/`teacherId` — never from a
> client-supplied `courseId` — after `assertTeacherOwnsResource`. This
> unblocks the file-attachment flow noted as missing in
> `phase-09-lesson-management.md` (TASK-904's note: "hasn't started, so
> there's nothing yet to attach a file *to*"). Tests added to
> `uploadService.test.ts` for the new target (missing lessonId, unknown
> lesson, another teacher's lesson, happy path).

## TASK-1302: File repository/service & `/api/files`
- Description: Persist metadata after client-side signed upload; deletion cascades Cloudinary + Firestore.
- Dependencies: TASK-1301
- Status: Done

> Note: Added `lib/validation/file.schema.ts` (`createFileSchema`,
> `listFilesQuerySchema`), `lib/server/repositories/fileRepository.ts`
> (`files/{fileId}` per `database/collections.md`, same shape as
> `lessonRepository`/`courseRepository`), and
> `lib/server/services/fileService.ts`. `POST /api/files` /
> `GET /api/files` / `DELETE /api/files/[fileId]` added.
>
> Ownership: `createFile` never trusts a client-supplied `courseId`/
> `teacherId` when `lessonId` is given — both are derived from the
> lesson doc itself after `assertTeacherOwnsResource`, mirroring
> TASK-1301's folder-resolution rule. `listFiles` requires one of
> `courseId`/`lessonId` and re-verifies ownership via
> `lessonRepository.findById` + `assertTeacherOwnsResource` or
> `courseService.getCourse` before querying.
>
> Deletion cascade (`fileService.deleteFile`, per
> `cloudinary/README.md` "Deletion strategy" and
> `security/error-handling.md` "Cloudinary/Firestore compound
> operations"): added `destroyCloudinaryUpload` +
> `resourceTypeFromMimeType` to `lib/server/cloudinary.ts` (signed
> Admin API `destroy` call, `not found` treated as success for
> idempotency). The Cloudinary destroy runs *before* the Firestore
> delete, so a Cloudinary failure leaves the file record in place
> (safe to retry) instead of orphaning the Firestore doc. When the
> deleted file was attached to a lesson, its id is also pulled out of
> `lesson.fileIds`.
>
> Not done here: `firestore.rules` has no `files/{fileId}` match block
> yet — consistent with the existing gap already present for
> `lessons`/`quizzes`/`questions`/`enrollments`/`payments` (none of
> those have rules either, despite being Done), which TASK-603's note
> already flags as deferred to Phase 16 (Testing) alongside the
> emulator/rules-unit-testing setup. Adding a `files` rule alone, out
> of step with its siblings, would be inconsistent with that plan.
>
> Unit tests: `fileRepository.test.ts`, `fileService.test.ts`,
> `cloudinary.test.ts` (destroy + MIME-to-resource-type mapping),
> `app/api/files/route.test.ts`,
> `app/api/files/[fileId]/route.test.ts`, plus new
> `uploadService.test.ts` cases for TASK-1301's `lesson-file` target.
> Full suite run in this sandbox (network available for npm/vitest,
> unlike the Firebase-emulator-dependent tasks): 330/330 passing.

## TASK-1303: File uploader & list UI
- Dependencies: TASK-1302, TASK-204
- Status: Done

> Note: Implemented as a per-lesson uploader/list rather than a
> standalone route — `components/lesson/lesson-file-manager.tsx`
> (`LessonFileManager`), toggled open from a "Files" button on each row
> in `components/teacher/lesson-manager.tsx` (the same pattern already
> used there for the video "Preview" toggle). Uses `GET /api/files?
> lessonId=`, `uploadLessonFile` (new in `lib/client/upload.ts`, the
> `lesson-file`-target counterpart to the existing `uploadImage`) +
> `POST /api/files` to attach, and `DELETE /api/files/[fileId]` to
> remove (which cascades the Cloudinary asset server-side, TASK-1302).
> Client-side 20 MB cap before signing, mirroring
> `course-manager.tsx`'s `MAX_THUMBNAIL_BYTES` pattern for the
> thumbnail uploader.
>
> `lib/client/upload.ts` was refactored to share a `signAndUpload`
> core between `uploadImage` (unchanged behavior, still hardcoded to
> the `image` Cloudinary endpoint) and the new `uploadLessonFile`,
> which resolves `resource_type` from the file's own MIME type via a
> small client-side `resourceTypeForMimeType` (a deliberate duplicate
> of `lib/server/cloudinary.ts`'s `resourceTypeFromMimeType` — kept
> separate rather than shared so the client bundle never imports the
> `server-only` module).
>
> The standalone `/teacher/files` route (`app/[locale]/(protected)/
> teacher/files/page.tsx`, a TASK-701 nav placeholder) is intentionally
> left as "coming soon" — files are always scoped to a lesson in this
> data model (`database/collections.md`: `courseId`/`lessonId` both
> optional but a file is only ever created attached to one or the
> other from the UI), so a per-lesson list inside the course detail
> page is the natural home; a cross-course "all files" view wasn't
> asked for by this task's description and isn't blocked by anything
> here if wanted later.
>
> Translations added under `teacherDashboard.lessons.files.*` in both
> `messages/en.json` and `messages/ar.json` — `check-translations.ts`
> confirms parity (385 keys in sync). `check-rtl-ltr.ts` passes (no
> physical start/end classes introduced).
>
> Tests: `lib/client/upload.test.ts` (new — `resourceTypeForMimeType`,
> `uploadImage`, `uploadLessonFile`, sign/upload failure paths). No
> component-level test for `LessonFileManager` itself: this repo's
> `vitest.config.mts` runs in `environment: "node"` (no jsdom) and has
> no existing `.test.tsx` precedent — component testing would need a
> DOM environment added first, which is out of scope here.
>
> Full suite after this task: 335/335 passing; `tsc --noEmit` and
> `eslint .` both clean (same 10 pre-existing `PageProps`/`LayoutProps`
> tsc errors from missing Next.js generated types, unrelated to this
> work, and the same 4 pre-existing lint warnings).

## TASK-1304: Standalone teacher files page
- Description: The `/teacher/files` nav route (TASK-701's placeholder, deliberately left "coming soon" by TASK-1303) had no real page behind it even though a per-lesson uploader/list existed — a teacher clicking "Files" in the sidebar landed on dead content. Build the cross-course view TASK-1303 explicitly deferred: every file the signed-in teacher owns, across every course/lesson, with a search filter and delete.
- Dependencies: TASK-1302, TASK-204
- Affected modules: `app/[locale]/(protected)/teacher/files/page.tsx`, `components/teacher/teacher-files-manager.tsx` (new), `lib/server/repositories/fileRepository.ts`, `lib/server/repositories/lessonRepository.ts`, `lib/server/services/fileService.ts`, `lib/validation/file.schema.ts`
- Status: Done

> Found while auditing the app for un-implemented-but-linked pages —
> the sidebar's "Files" entry (`teacherDashboard.nav.files`) always
> pointed at this route, but it only ever rendered
> `{t("common.comingSoon")}"`, permanently, per TASK-1303's own note
> ("the standalone `/teacher/files` route... is intentionally left as
> 'coming soon'"). That was a reasonable scope cut at the time (no
> cross-course view had been asked for), but it left a real dead link
> in the nav — worth closing now that it's the only "coming soon" page
> left with a live sidebar entry pointing at it.
>
> Data model didn't change — a file is still only ever created
> attached to a lesson or a bare course (`docs/database/collections.md`
> is unchanged); this task only adds a *read* path over the existing
> `files/{fileId}` docs, teacher-scoped instead of course/lesson-scoped:
> - `fileRepository.listByTeacher(teacherId)` — new, same
>   `where("teacherId", "==", ...)` + sort-by-`createdAt`-desc shape as
>   the existing `listByCourse`/`listByLesson`.
> - `lessonRepository.findByIds(ids)` — new, added because this page
>   needs to join `files.lessonId` to a lesson title; mirrors
>   `courseRepository.findByIds`'s existing chunked `where("__name__",
>   "in", chunk)` pattern (`courseRepository` already had this from
>   TASK-1002's student-detail join; `lessonRepository` never needed
>   one until now).
> - `fileService.listFiles` gains a third branch: when neither
>   `courseId` nor `lessonId` is given, it now returns
>   `fileRepository.listByTeacher(session.uid)` instead of throwing —
>   previously `listFilesQuerySchema`'s `refine` rejected that case
>   outright (`errors.validation`, a 400). `teacherId` is always
>   `session.uid`, never a client-supplied param, same rule the other
>   two branches already followed. Existing `courseId`/`lessonId`
>   behavior (`LessonFileManager`'s per-lesson calls) is unchanged —
>   this is a strictly additive third case, not a rewrite.
> - `listFilesQuerySchema`'s `refine` was removed accordingly — both
>   fields are simply optional now, "list everything" being a valid
>   query rather than a validation error. Updated the two tests that
>   asserted the old "must supply one" behavior
>   (`app/api/files/route.test.ts`, `lib/server/services/fileService
>   .test.ts`) to assert the new "lists everything, scoped to my own
>   teacherId" behavior instead, plus a new `fileRepository.test.ts`
>   case for `listByTeacher` itself.
>
> New `TeacherFilesManager` (`components/teacher/teacher-files-manager
> .tsx`, client component): a searchable table (file name/link, course,
> lesson, size, upload date) with a delete action reusing the exact
> confirm-dialog flow `LessonFileManager` (TASK-1303) already has —
> `DELETE /api/files/[fileId]`, which cascades the Cloudinary asset and
> the owning lesson's `fileIds` server-side (`fileService.deleteFile`,
> unchanged). No upload entry point here on purpose: uploading still
> only makes sense attached to a specific lesson (or, in principle, a
> bare course), so `LessonFileManager` stays the only place a file gets
> created — this page is a read/search/delete surface over the same
> underlying docs, not a second upload flow.
> Extracted `formatBytes` (previously private to `lesson-file-manager
> .tsx`) into `lib/utils/format-bytes.ts` so both components share one
> copy instead of duplicating it.
> New `teacherDashboard.files.*` keys added to both `messages/en.json`
> and `messages/ar.json` (864 keys in sync, `npm run check-translations`
> passes); `npm run check-rtl` passes — no physical `left`/`right`
> classes introduced.
>
> Full verification, run for real in this environment (network was
> available this session, unlike most of the project's history):
> `npm install` (770 packages), `npx next build` (production,
> Turbopack) — compiled successfully, all routes including
> `/[locale]/teacher/files` generated; `npx tsc --noEmit` clean;
> `npx eslint .` — 0 errors, same 5 pre-existing warnings, none new;
> `npx vitest run` — **104/104 files, 640/640 tests passing** (639
> pre-existing + 1 new `listByTeacher` case, plus the two rewritten
> ones above); `npm run check-translations` and `npm run check-rtl`
> both pass.
