import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { studentService } from "@/lib/server/services/studentService";
import { Breadcrumb } from "@/components/ui";
import { StudentDetailView } from "@/components/teacher/student-detail-view";

/**
 * TASK-1002 — student detail page: enrolled courses + progress for one of
 * the teacher's own students. Mirrors the course detail page's
 * `notFound()`-on-`NotFoundError` pattern (TASK-903).
 *
 * Quiz results are out of scope here — see `studentService`'s doc comment.
 */
export default async function TeacherStudentDetailPage({
  params,
}: PageProps<"/[locale]/teacher/students/[studentId]">) {
  const { locale, studentId } = await params;
  const t = await getTranslations();
  const session = await requireSession();
  assertRole(session, "teacher");

  let student;
  try {
    student = await studentService.getStudentDetail(session, studentId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t("teacherDashboard.nav.students"), href: `/${locale}/teacher/students` },
          { label: student.displayName },
        ]}
      />
      <StudentDetailView student={student} />
    </div>
  );
}
