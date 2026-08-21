# Phase 22 — Lesson Video Upload Widget

> The signed-upload plumbing for lesson video already exists — the
> Cloudinary folder layout reserves
> `teachers/{teacherId}/courses/{courseId}/lessons/{lessonId}/video/`
> (`docs/cloudinary/README.md`) and `uploadService`/`/api/uploads/sign`
> already handle images this way for course thumbnails and avatars. What's
> missing is a video-specific upload flow in the lesson form: today the
> teacher manually types the provider, the URL, **and** the raw Cloudinary
> `publicId` as three separate text fields (`components/teacher/lesson-
> manager.tsx`). This phase gives the teacher a real drag-and-drop upload
> (same pattern as the course thumbnail dropzone) for the Cloudinary path,
> and removes the manual `publicId` input entirely — it's filled in
> automatically from the upload response, the same way `courseId`'s
> thumbnail flow already fills in `thumbnailUrl`.

## TASK-2201: Signed upload support for the `video` resource type
- Description: `/api/uploads/sign` already signs `image` uploads (thumbnails/avatars); extend it (or confirm it already generalizes) to Cloudinary's `video` resource type, scoped to the `.../lessons/{lessonId}/video/` folder and gated by the same teacher-owns-this-lesson check as file uploads (`lesson-file-manager.tsx`'s pattern).
- Dependencies: TASK-1301 (file/upload signing), TASK-901 (lessons)
- Affected modules: `lib/server/services/uploadService.ts`, `app/api/uploads/sign/route.ts`
- Status: Done

> `uploadTargetSchema` gained `"lesson-video"` alongside `"lesson-file"`.
> `resolveFolder`'s new `lesson-video` case is a near-duplicate of
> `lesson-file`'s (same "lesson must already exist, ownership via
> `assertTeacherOwnsResource`" check) but resolves to the reserved
> `.../lessons/{lessonId}/video/` folder (`docs/cloudinary/README.md`)
> instead of `.../files/`, so a lesson's single video upload doesn't mix
> into its attachments list. `/api/uploads/sign/route.ts` needed no
> changes — it already just parses `signUploadSchema` and forwards to
> `uploadService.signUpload`, which is where the new target is handled.
> No signature-shape change was needed either: `signCloudinaryUpload`
> only signs `folder`/`timestamp` (`lib/server/cloudinary.ts`), not
> `resource_type` — the client already picks the Cloudinary
> `resource_type` (`image`/`video`/`raw`) from the file's own MIME type
> via `resourceTypeForMimeType` (`lib/client/upload.ts`, already
> supports `video/*`), so a video upload against this new folder already
> works end-to-end at the signing layer.
> Extended `uploadService.test.ts` with the same four-case pattern
> `lesson-file` already has (missing `lessonId`, unknown `lessonId`,
> another teacher's lesson, happy path) for `lesson-video`, plus one
> assertion that its folder differs from `lesson-file`'s for the same
> lesson. Could not run the suite — no `node_modules`/network in this
> sandbox (same limitation as every task in this phase's dependency
> chain); did a bracket-balance pass instead.

## TASK-2202: Video upload UI in the lesson form
- Description: Replace the lesson form's provider `Select` + free-text URL/`publicId` inputs with two clear paths: (a) "Paste a YouTube link" — a single URL input, `provider: "youtube"`; (b) "Upload a video" — a drag-and-drop dropzone identical in spirit to `course-manager.tsx`'s thumbnail dropzone, using TASK-2201's signature to upload straight to Cloudinary and set `provider: "cloudinary"`, `url`, and `publicId` from the upload response — no `publicId` field is ever shown to the teacher. Keep the existing `external` provider option (arbitrary embeddable URL) for anything that isn't YouTube or a direct upload.
- Dependencies: TASK-2201
- Affected modules: `components/teacher/lesson-manager.tsx`, `messages/en.json`, `messages/ar.json`
- Status: Done

> Replaced the provider `Select` + free-text URL/`publicId` inputs with
> a mode picker (`VideoMode`: youtube / upload / external / none) —
> distinct from the stored `VideoProvider` since "upload" always
> resolves to `provider: "cloudinary"` once a file lands, but starts
> out as neither URL. YouTube and external modes are still a single
> URL `Input` (kept as two near-identical JSX blocks rather than
> merged, since a future task splitting their validation — e.g.
> YouTube URL format checking — shouldn't have to first un-merge them).
> Upload mode reuses the exact dropzone markup/interaction pattern from
> `course-manager.tsx`'s thumbnail dropzone (click-to-browse +
> drag-and-drop, same spinner-overlay shape) rather than a new
> component, per "No Duplicate Functionality" — adapted for a single
> video file instead of an always-visible image preview, since a video
> dropzone showing "uploaded" text reads better than trying to inline a
> `<video>` preview in a 24-unit-tall box.
> New `uploadLessonVideo` (`lib/client/upload.ts`) — signs against the
> new `lesson-video` target (TASK-2201) and uploads via
> `XMLHttpRequest` instead of `signAndUpload`'s `fetch`, since `fetch`
> has no cross-browser upload-progress event and TASK-2203 needed one;
> kept as its own function rather than adding an `onProgress` option to
> `signAndUpload` itself, so the existing `uploadImage`/`uploadLessonFile`
> callers (thumbnails, attachments — neither needs progress) are
> untouched.
> Upload is only offered once the lesson already exists (`form.id` set)
> — same constraint `uploadService`'s `lesson-video` folder resolution
> enforces server-side (TASK-2201) — with a translated inline message
> (`errors.videoUploadNeedsLesson`) rather than hiding the "Upload"
> mode option entirely, so a teacher filling the create form
> understands *why* rather than wondering where it went.
> Added `messages/en.json`/`ar.json` `teacherDashboard.lessons.fields.
> video`/`uploadVideo`/`videoUploaded`/`videoUploadProgress`/
> `removeVideo`, a new `videoMode` namespace, and updated `hints.video`;
> kept the existing `videoProvider` namespace (still used for the
> lesson list's provider `Badge`). Removed the now-unused `fields.
> videoProvider`/`videoProviderPlaceholder`/`videoPublicId` keys — the
> publicId is never shown to the teacher per this task's own
> description. Ran the same full-tree key-parity check
> `scripts/check-translations.ts` performs (by hand, no `node_modules`
> in this sandbox) — 0 keys missing either direction.
> No RTL-specific changes needed: the new markup uses only logical
> Tailwind utilities (`text-start`, `ms-`/`me-`/`ps-`/`pe-`), same as
> the rest of this component and the thumbnail dropzone it mirrors —
> checked by hand against `docs/internationalization/rtl-ltr.md`'s
> rules (no `node_modules` to run `scripts/check-rtl-ltr.ts`).
> `VideoPlayer`/lesson-list preview and `LessonFileManager` sections
> are unchanged — this task only touches the create/edit form.

## TASK-2203: Upload progress + size/format guardrails
- Description: Video files are large — add an upload-progress indicator (reusing/adapting the spinner overlay already on the thumbnail dropzone) and client-side pre-checks (max file size, allowed formats) before the upload starts, with a translated error message on rejection.
- Dependencies: TASK-2202
- Affected modules: `components/teacher/lesson-manager.tsx`, `messages/en.json`, `messages/ar.json`
- Status: Done

> Landed together with TASK-2202 rather than as a separate pass, since
> the dropzone/upload function this task extends didn't exist until
> that task built it, and the two together read as one coherent
> change — noted here for the record rather than re-touching the same
> lines a second time:
> - **Pre-checks**: `ACCEPTED_VIDEO_TYPES` (`mp4`/`webm`/`quicktime`/
>   `x-matroska`) checked against `file.type` before any network call,
>   `MAX_VIDEO_BYTES` (500 MB — generous for a full lesson recording,
>   same "catch an obviously-wrong file early" reasoning as
>   `course-manager.tsx`'s `MAX_THUMBNAIL_BYTES`/`lesson-file-
>   manager.tsx`'s `MAX_LESSON_FILE_BYTES`) checked against `file.size`.
>   Both rejections set a translated `videoError` and return before
>   `uploadLessonVideo` is ever called.
> - **Progress**: `uploadLessonVideo`'s `onProgress` callback (driven by
>   `XMLHttpRequest.upload.onprogress`) updates `videoUploadProgress`
>   state, rendered as `{percent}%` text inside the same spinner overlay
>   the thumbnail dropzone uses (`bg-background/80` over the dropzone,
>   `role="status"` on the percent text for screen readers) rather than
>   a separate progress-bar component.
> Error copy (`errors.videoType`/`videoSize`) and the accept-attribute
> on the hidden file input share the same `ACCEPTED_VIDEO_TYPES`
> constant, so the browser's own file picker and the JS pre-check can't
> drift out of sync.
