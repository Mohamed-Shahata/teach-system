# Phase 24 — Admin Oversight Enhancements

> Three additions to the Phase 19 Admin Dashboard (`features/
> admin-dashboard.md`): visibility into every teacher's courses, letting
> a teacher be assigned more than one subject, and drilling into a
> single teacher's students from the Admin side.

## TASK-2401: Center-wide courses list (read-only)
- Description: New Admin screen listing every course across every teacher (title, teacher, subject, stage, status, enrollment count) with search/filter by teacher/subject/stage/status — same shape as `TeacherManager`/`StudentManager` (TASK-1903/1904): a service that joins `courses` with `teacherProfiles`/`users` for display names, read-only (no edit/delete from here — that stays teacher-owned, per the existing ownership model in `architecture/ownership-model.md`).
- Dependencies: TASK-1901, TASK-801 (course repository/service)
- Affected modules: `lib/server/services/adminCourseOverviewService.ts` (new), `app/api/admin/courses/route.ts`, `components/admin/course-overview.tsx` (new), `app/[locale]/(protected)/admin/courses/page.tsx` (new)
- Status: Not Started

## TASK-2402: Multiple subjects per teacher
- Description: Today `teacherProfiles.subjectId`/`users.subjectId` is a single ref (per `teacherProfileRepository`'s doc comment: "one specialization per teacher"), while `database/collections.md` already documents the target shape as `subjectIds: string[]`. This task closes that gap: migrate the field to an array, update `accountService.createAccountByAdmin`/`updateTeacherProfileSchema` to accept multiple subject ids, update the Admin's Teacher edit dialog to a multi-select, and update `teacher/courses/page.tsx`'s "narrow to the teacher's own assigned subject(s)" filter (currently `allSubjects.filter(s => s.id === teacherProfile.subjectId)`) to filter against the array instead. Keep `teacherOfferings` (subject+stage+price, already many-per-teacher) as-is — this is about which subjects a teacher may create *courses* under, a separate concern from pricing offerings.
- Dependencies: TASK-1903, TASK-803 (course creation subject filter)
- Affected modules: `lib/server/repositories/teacherProfileRepository.ts`, `lib/validation/account.schema.ts`, `lib/server/services/accountService.ts`, `components/admin/teacher-manager.tsx`, `app/[locale]/(protected)/teacher/courses/page.tsx`, `database/collections.md`
- Status: Not Started

## TASK-2403: Per-teacher student drill-down (Admin)
- Description: From the Admin's Teacher detail (or the existing center-wide Student list, filterable by teacher), show the same "this teacher's students, their courses, progress" view the teacher already sees of their own (`StudentList`/`student-detail-view.tsx`, TASK-1002), reused read-only for an Admin session. `studentService.listStudents`/`studentManagementService` already accept an Admin session per the existing ownership model (repositories don't scope Admin reads) — this is mostly a UI entry point (a "View students" action on a teacher row) plus confirming the service layer's Admin path is exercised by a route + test.
- Dependencies: TASK-1903, TASK-1001
- Affected modules: `components/admin/teacher-manager.tsx` (new action → link), `app/[locale]/(protected)/admin/teachers/[teacherId]/students/page.tsx` (new)
- Status: Not Started
