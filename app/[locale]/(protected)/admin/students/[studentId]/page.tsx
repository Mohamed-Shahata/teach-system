import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { studentManagementService } from "@/lib/server/services/studentManagementService";
import { studentService } from "@/lib/server/services/studentService";
import { subscriptionService } from "@/lib/server/services/subscriptionService";
import { paymentService } from "@/lib/server/services/paymentService";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { Breadcrumb } from "@/components/ui";
import { StudentAccountView } from "@/components/admin/student-account-view";

/**
 * TASK-3307 — Admin's read-only account page for one student: the
 * TASK-3201 profile plus enrollments (across every teacher — called
 * without a `teacherId`, unlike the per-teacher drill-down at
 * `admin/teachers/[teacherId]/students/[studentId]`), subscriptions, and
 * payment history.
 *
 * `studentService.getStudentDetail` throws `NotFoundError` when a
 * student has zero enrollments (see its own doc comment) — that's a
 * valid, expected state here (a newly created student), not a missing
 * page, so it's caught separately from the `studentManagementService`
 * lookup that actually confirms the account exists.
 */
export default async function AdminStudentAccountPage({
  params,
}: PageProps<"/[locale]/admin/students/[studentId]">) {
  const { locale, studentId } = await params;
  const t = await getTranslations();
  const session = await requireSession();

  let student;
  try {
    student = await studentManagementService.getStudentDetail(session, studentId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const [enrollmentDetail, subscriptions, payments] = await Promise.all([
    studentService.getStudentDetail(session, studentId).catch((err) => {
      if (err instanceof NotFoundError) return null;
      throw err;
    }),
    subscriptionService.listForStudent(session, studentId),
    paymentService.listForStudentAdmin(session, studentId),
  ]);

  const teacherIds = Array.from(new Set(subscriptions.map((subscription) => subscription.teacherId)));
  const teachers = await userRepository.findByIds(teacherIds);
  const teacherNames = new Map(
    Array.from(teachers.entries()).map(([uid, user]) => [uid, user.displayName]),
  );

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t("adminDashboard.nav.students"), href: `/${locale}/admin/students` },
          { label: student.displayName },
        ]}
      />
      <StudentAccountView
        student={student}
        enrollments={enrollmentDetail?.courses ?? []}
        subscriptions={subscriptions}
        payments={payments}
        teacherNames={teacherNames}
      />
    </div>
  );
}
