# Feature: File Management

## Purpose
Let teachers upload and manage educational resources (PDFs, images,
documents, videos) attached to courses/lessons.

## Data
`files/{fileId}` — see `database/collections.md`.

## Flow
See `cloudinary/README.md` for the signed-upload sequence. Metadata is
persisted to Firestore only after Cloudinary confirms the upload.

## Authorization
Only the owning teacher can upload/delete files under their own
`teacherId` folder; the signing endpoint enforces this before ever
issuing a signature.

## Where files are managed
- **Per-lesson (upload + list)**: `LessonFileManager`, opened from a
  "Files" button on each row in the course detail page's lesson list.
  This is the only place a file is created — upload always attaches to
  a specific lesson (or, at the API layer, a bare course).
- **Cross-course (browse + delete)**: `/teacher/files` (TASK-1304) —
  every file the signed-in teacher owns, across every course/lesson,
  in one searchable table (file name, course, lesson, size, upload
  date), with the same delete action as the per-lesson view. No upload
  entry point here — it's a read/search/delete surface over the same
  underlying docs, not a second creation flow. `fileService.listFiles`
  returns this teacher-scoped "everything" list when neither
  `courseId` nor `lessonId` is given in the query, always scoped to
  `session.uid`, never a client-supplied teacherId.
