import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { teacherManagementService } from "@/lib/server/services/teacherManagementService";
import { studentService } from "@/lib/server/services/studentService";
import { Breadcrumb } from "@/components/ui";
import { StudentDetailView } from "@/components/teacher/student-detail-view";

/**
 * TASK-2403 — one student's detail (enrolled courses + progress) within
 * one teacher's roster, from the Admin side. Mirrors `teacher/students/
 * [studentId]/page.tsx`'s `notFound()`-on-`NotFoundError` pattern, reusing
 * the same `StudentDetailView` (TASK-1002) read-only.
 */
export default async function AdminTeacherStudentDetailPage({
  params,
}: PageProps<"/[locale]/admin/teachers/[teacherId]/students/[studentId]">) {
  const { locale, teacherId, studentId } = await params;
  const t = await getTranslations();
  const session = await requireSession();

  let teacher;
  let student;
  try {
    teacher = await teacherManagementService.getTeacherDetail(session, teacherId);
    student = await studentService.getStudentDetail(session, studentId, teacherId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t("adminDashboard.nav.teachers"), href: `/${locale}/admin/teachers` },
          {
            label: t("adminDashboard.teachers.studentsPageTitle", { name: teacher.displayName }),
            href: `/${locale}/admin/teachers/${teacherId}/students`,
          },
          { label: student.displayName },
        ]}
      />
      <StudentDetailView student={student} />
    </div>
  );
}
