import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { teacherManagementService } from "@/lib/server/services/teacherManagementService";
import { teacherProfileService } from "@/lib/server/services/teacherProfileService";
import { teacherOfferingService } from "@/lib/server/services/teacherOfferingService";
import { adminCourseOverviewService } from "@/lib/server/services/adminCourseOverviewService";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { Breadcrumb } from "@/components/ui";
import { TeacherAccountView } from "@/components/admin/teacher-account-view";

/**
 * TASK-3307 — Admin's read-only account page for one teacher: the
 * TASK-3101/3102 profile plus their courses/offerings, same information
 * the teacher sees about themselves. Mirrors the `reviews`/`students`
 * subpages' `notFound()`-on-`NotFoundError` pattern.
 */
export default async function AdminTeacherAccountPage({
  params,
}: PageProps<"/[locale]/admin/teachers/[teacherId]">) {
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

  const [profile, offerings, allCourses, subjects, stages] = await Promise.all([
    teacherProfileService.getProfileForAdmin(session, teacherId),
    teacherOfferingService.listForTeacher(session, teacherId),
    adminCourseOverviewService.listCourses(session),
    centerConfigService.listSubjects(session),
    centerConfigService.listEducationStages(session),
  ]);

  const courses = allCourses.filter((course) => course.teacherId === teacherId);
  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));
  const stageNames = new Map(stages.map((stage) => [stage.id, stage.name]));

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t("adminDashboard.nav.teachers"), href: `/${locale}/admin/teachers` },
          { label: teacher.displayName },
        ]}
      />
      <TeacherAccountView
        locale={locale}
        teacher={teacher}
        profile={profile}
        offerings={offerings}
        courses={courses}
        subjectNames={subjectNames}
        stageNames={stageNames}
      />
    </div>
  );
}
