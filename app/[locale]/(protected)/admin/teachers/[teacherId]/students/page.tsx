import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { teacherManagementService } from "@/lib/server/services/teacherManagementService";
import { studentService } from "@/lib/server/services/studentService";
import { Breadcrumb } from "@/components/ui";
import { StudentList } from "@/components/teacher/student-list";

/**
 * TASK-2403 — Admin's per-teacher student drill-down: the same read-only
 * "students, their courses, progress" view a teacher sees of their own
 * (`StudentList`, TASK-1002), reused here for one teacher at a time from
 * the Admin side. `studentService.listStudents` already accepts an Admin
 * session (`scopeToTeacher`'s admin bypass, `lib/server/repositories/
 * base.ts`); the `teacherId` param added for this task narrows that
 * otherwise-unscoped read down to this one teacher (see the service's
 * own doc comment). No create-a-student form here — that stays
 * teacher-owned (TASK-1000's `StudentManager`), per the existing
 * ownership model.
 */
export default async function AdminTeacherStudentsPage({
  params,
}: PageProps<"/[locale]/admin/teachers/[teacherId]/students">) {
  const { locale, teacherId } = await params;
  const t = await getTranslations();
  const session = await requireSession();

  let teacher;
  try {
    teacher = await teacherManagementService.getTeacherDetail(session, teacherId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const students = await studentService.listStudents(session, teacherId);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t("adminDashboard.nav.teachers"), href: `/${locale}/admin/teachers` },
          { label: t("adminDashboard.teachers.studentsPageTitle", { name: teacher.displayName }) },
        ]}
      />
      <h1 className="text-2xl font-semibold text-foreground">
        {t("adminDashboard.teachers.studentsPageTitle", { name: teacher.displayName })}
      </h1>
      <StudentList students={students} basePath={`/admin/teachers/${teacherId}/students`} />
    </div>
  );
}
