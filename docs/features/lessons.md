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
in the parent course (see `enrollment.md`), **or** (TASK-3204) if they
hold an active Phase 29 subscription covering the course's
teacher+subject+stage — **unless** the lesson is flagged
`isFreePreview: true` (TASK-3105), in which case any signed-in
student may read/watch it without an enrollment or subscription. A
teacher marks a lesson as free preview from the same create/edit form
used for its other fields (`components/teacher/lesson-manager.tsx`);
there's no separate endpoint or role. The bypass is enforced in both
places the enrollment gate normally applies: the `firestore.rules`
read rule on `lessons/{lessonId}`, and `lessonService
.getLessonForStudent`'s `assertStudentHasCourseAccess` check (enrollment
OR active subscription OR admin). Everything else about a free-preview
lesson (files, quiz gating, etc.) is unaffected — the flag only widens
who may read/watch that one lesson's own content.

A course's detail page (`lessonService.listLessonsForCourseDetail`,
TASK-3204) is open to any authenticated student regardless of
enrollment/subscription — it returns each lesson's title/order/
preview-flag plus a `locked` boolean, but deliberately never `video`/
`fileIds`, so a locked lesson's content stays behind
`getLessonForStudent`'s own server-side gate rather than merely being
hidden client-side.

## Extensibility
`video.provider` is a discriminated union so new providers can be added
by extending the type + the `<VideoPlayer>` switch, without touching
existing providers (see `architecture/overview.md`).
