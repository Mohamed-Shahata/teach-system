# Phase 23 — "My Teachers" (Student-Facing)

> A student currently has no in-dashboard way to see who they're
> enrolled with — the public `/teachers/[slug]` page (`features/
> public-pages.md`) exists, but nothing links a student to *their own*
> teachers from inside the student dashboard. This phase adds that list,
> derived the same way `features/students.md` already derives a
> teacher's "my students" — from `enrollments`, not a new relationship
> collection.

## TASK-2301: "My teachers" derived list service
- Description: New read: for the signed-in student, the distinct set of teachers they have an *active* (or any non-cancelled — decide against `features/enrollment.md`'s existing status semantics) enrollment with, each with a course count and a link. Mirrors `studentService.listStudents`' derive-from-enrollments shape (TASK-1001), just from the student's side instead of the teacher's.
- Dependencies: TASK-1101 (enrollment repository)
- Affected modules: `lib/server/services/teacherDirectoryService.ts` (new, or extend `studentService`), `app/api/student/teachers/route.ts`
- Status: Not Started

## TASK-2302: "My teachers" page UI
- Description: New student nav item + page listing each teacher (avatar, name, subject) with a link into that teacher's courses. Add the nav entry to `components/layout/student-sidebar.tsx` (currently just "My Courses" + "Settings").
- Dependencies: TASK-2301, TASK-204
- Affected modules: `app/[locale]/(protected)/student/teachers/page.tsx` (new), `components/layout/student-sidebar.tsx`, `messages/en.json`, `messages/ar.json`
- Status: Not Started

## TASK-2303: Teacher courses view, scoped to enrollment
- Description: Clicking a teacher from TASK-2302 should show that teacher's courses — reuse the public `publicRepository` course list (`features/public-pages.md`) for published courses, but additionally flag which ones this student is already enrolled in vs. which are available to enroll/purchase. Not a full "browse & buy" storefront redesign — just enough to answer "what else does this teacher offer."
- Dependencies: TASK-2301, TASK-1401 (public pages)
- Affected modules: `app/[locale]/(protected)/student/teachers/[teacherId]/page.tsx` (new)
- Status: Not Started
