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
- Status: Not Started

## TASK-2202: Video upload UI in the lesson form
- Description: Replace the lesson form's provider `Select` + free-text URL/`publicId` inputs with two clear paths: (a) "Paste a YouTube link" — a single URL input, `provider: "youtube"`; (b) "Upload a video" — a drag-and-drop dropzone identical in spirit to `course-manager.tsx`'s thumbnail dropzone, using TASK-2201's signature to upload straight to Cloudinary and set `provider: "cloudinary"`, `url`, and `publicId` from the upload response — no `publicId` field is ever shown to the teacher. Keep the existing `external` provider option (arbitrary embeddable URL) for anything that isn't YouTube or a direct upload.
- Dependencies: TASK-2201
- Affected modules: `components/teacher/lesson-manager.tsx`, `messages/en.json`, `messages/ar.json`
- Status: Not Started

## TASK-2203: Upload progress + size/format guardrails
- Description: Video files are large — add an upload-progress indicator (reusing/adapting the spinner overlay already on the thumbnail dropzone) and client-side pre-checks (max file size, allowed formats) before the upload starts, with a translated error message on rejection.
- Dependencies: TASK-2202
- Affected modules: `components/teacher/lesson-manager.tsx`, `messages/en.json`, `messages/ar.json`
- Status: Not Started
