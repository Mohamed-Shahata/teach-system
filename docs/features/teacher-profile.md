# Feature: Teacher Profile

## Purpose
Lets a teacher fill in and edit the richer `teacherProfiles` fields added
by TASK-3101 (bio, headline, years of experience, specialization, social
links, avatar) — the information a prospective student sees on the
directory card (TASK-2302) and public profile page (Phase 27) before
subscribing.

## User story
As a teacher, I want a dedicated page to describe myself professionally
so students can decide whether to subscribe to my courses.

## Data
Reads/writes `teacherProfiles/{teacherId}` (doc id === the teacher's own
uid). `teacherProfileRepository.updateDetails` only writes the fields
present in the request body — a genuine partial patch, so a teacher can
save one field at a time. `bio`/`headline` are bilingual maps (`{en,
ar}`); everything else is single-valued. See
`docs/database/collections.md` for the full field list (added by
TASK-3101).

This page's `avatarUrl` is `teacherProfiles.avatarUrl` (the public,
student-facing picture), not `users.avatarUrl` (the account picture
edited on `/teacher/settings`, TASK-705) — the two are independent and
can differ. Both reuse the same signed-upload `target: "avatar"`, which
resolves to the same `teachers/{uid}/avatar` Cloudinary folder either
way (`uploadService.resolveFolder`), so the Cloudinary asset is shared
even though the two Firestore fields are written separately.

## Authorization
`GET`/`PATCH /api/teacher/profile` both require an authenticated
`teacher` session (`assertRole(session, "teacher")` in
`teacherProfileService`); a teacher can only ever read/write their own
profile — there's no `teacherId` param, the session's own `uid` is
always the doc id. Distinct from `teacherManagementService`'s
Admin-only `updateProfileFields` (name/subject), which remains
Admin-only.

## Completeness indicator
`MyTeacherProfile.completeness` is a server-computed 0–100 percentage —
one of the six TASK-3101 fields filled = one sixth. It's advisory only:
every field on this page is optional and a teacher can save any subset
without being blocked.

## i18n / RTL
`bio` and `headline` are edited as separate English/Arabic inputs side
by side (same bilingual-pair pattern as course title/description in
`CourseManager`); the Arabic inputs render `dir="rtl"` regardless of the
active UI locale, since a teacher may want to fill in the Arabic bio
while browsing the dashboard in English or vice versa. All page chrome
(labels, headings, buttons) comes from `messages/{en,ar}.json`'s
`teacherDashboard.profile` namespace.

## Deliberately out of scope (this task)
- Nav bar profile icon linking here — TASK-3103.
- Reading these fields back into the public profile / directory card —
  already covered on the read side by TASK-3101's `extractProfileDetails`
  (all four `teacherProfileRepository` read methods already return the
  new fields); no separate work needed here.
- `publicRepository.ts`'s separate `PublicTeacherProfile.bio` (plain
  string) still stringifying a migrated map-shaped `bio` — a gap flagged
  in TASK-3101, deferred to whichever of TASK-3102/3203 touches the
  public-facing read side. Not fixed by this task either, since this
  task only touches the teacher-facing write side.
