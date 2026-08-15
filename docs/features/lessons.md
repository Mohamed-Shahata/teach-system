# Feature: Lesson Management

## Purpose
Organize educational content within a course.

## User stories
- As a teacher, I can add/edit/delete/reorder lessons inside a course.
- As a teacher, I can attach a video (Cloudinary, YouTube, or an
  external URL) and files to a lesson.

## Data
`lessons/{lessonId}` — see `database/collections.md`. `courses.lessonOrder`
is the authoritative ordering; `lessons.order` is kept in sync for
querying convenience.

## Authorization
Owning teacher only. Students may read lesson content only if enrolled
in the parent course (see `enrollment.md`).

## Extensibility
`video.provider` is a discriminated union so new providers can be added
by extending the type + the `<VideoPlayer>` switch, without touching
existing providers (see `architecture/overview.md`).
