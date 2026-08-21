import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card, EmptyState } from "@/components/ui";
import type { TeacherDetail } from "@/lib/server/services/teacherManagementService";
import type { MyTeacherProfile } from "@/lib/server/services/teacherProfileService";
import type { TeacherOfferingDoc } from "@/lib/server/repositories/teacherOfferingRepository";
import type { AdminCourseOverviewEntry } from "@/lib/server/services/adminCourseOverviewService";
import type { LocalizedText } from "@/lib/server/repositories/subjectRepository";

interface TeacherAccountViewProps {
  locale: string;
  teacher: TeacherDetail;
  profile: MyTeacherProfile | null;
  offerings: TeacherOfferingDoc[];
  courses: AdminCourseOverviewEntry[];
  subjectNames: Map<string, LocalizedText>;
  stageNames: Map<string, LocalizedText>;
}

function localized(value?: { en?: string; ar?: string }): string {
  return value?.en || value?.ar || "";
}

/**
 * TASK-3307 — Admin's read-only view of one teacher's account: the same
 * information the teacher sees about themselves (TASK-3101/3102 profile),
 * plus the course/student/enrollment stats and (subject, stage) pricing
 * an Admin already manages elsewhere (TASK-1903/2402), gathered on one
 * page. No edit controls here — those stay on the existing Teacher
 * management dialogs (`TeacherManager`) and the teacher's own settings.
 */
export async function TeacherAccountView({
  locale,
  teacher,
  profile,
  offerings,
  courses,
  subjectNames,
  stageNames,
}: TeacherAccountViewProps) {
  const t = await getTranslations("adminDashboard.teachers.profile");
  const format = await getFormatter();

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{teacher.displayName}</h1>
            <p className="mt-1 text-sm text-foreground/60">{teacher.email}</p>
            {teacher.phone && <p className="text-sm text-foreground/60">{teacher.phone}</p>}
          </div>
          <Badge variant={teacher.disabled ? "warning" : "success"}>
            {t(teacher.disabled ? "status.deactivated" : "status.active")}
          </Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-foreground/60">{t("stats.courses")}</dt>
            <dd className="text-lg font-semibold text-foreground">{teacher.stats.totalCourses}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground/60">{t("stats.students")}</dt>
            <dd className="text-lg font-semibold text-foreground">{teacher.stats.totalStudents}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground/60">{t("stats.enrollments")}</dt>
            <dd className="text-lg font-semibold text-foreground">{teacher.stats.totalEnrollments}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground/60">{t("stats.joined")}</dt>
            <dd className="text-sm text-foreground/80">
              {format.dateTime(new Date(teacher.createdAt), { dateStyle: "medium" })}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/teachers/${teacher.uid}/students`}
            className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            {t("viewStudents")}
          </Link>
          <Link
            href={`/${locale}/admin/teachers/${teacher.uid}/reviews`}
            className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            {t("viewReviews")}
          </Link>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">{t("profileTitle")}</h2>
        {!profile ? (
          <EmptyState title={t("profileEmptyTitle")} description={t("profileEmptyDescription")} />
        ) : (
          <Card className="flex flex-col gap-3 p-5 text-sm">
            {profile.headline && <p className="font-medium text-foreground">{localized(profile.headline)}</p>}
            {profile.bio && <p className="text-foreground/70">{localized(profile.bio)}</p>}
            <div className="flex flex-wrap gap-4 text-foreground/70">
              {typeof profile.yearsOfExperience === "number" && (
                <span>{t("yearsOfExperience", { years: profile.yearsOfExperience })}</span>
              )}
              {profile.specialization && <span>{profile.specialization}</span>}
            </div>
          </Card>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">{t("offeringsTitle")}</h2>
        {offerings.length === 0 ? (
          <EmptyState title={t("offeringsEmpty")} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3 bg-surface-muted px-4 py-2 text-sm font-medium text-foreground">
              <span>{t("columns.subject")}</span>
              <span>{t("columns.stage")}</span>
              <span className="text-end">{t("columns.price")}</span>
            </div>
            {offerings.map((offering) => (
              <div key={offering.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 px-4 py-3 text-sm">
                <span className="text-foreground">{localized(subjectNames.get(offering.subjectId))}</span>
                <span className="text-foreground/80">{localized(stageNames.get(offering.stageId))}</span>
                <span className="text-end tabular-nums text-foreground/70">{offering.monthlyPrice}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">{t("coursesTitle")}</h2>
        {courses.length === 0 ? (
          <EmptyState title={t("coursesEmpty")} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-surface-muted px-4 py-2 text-sm font-medium text-foreground">
              <span>{t("columns.course")}</span>
              <span>{t("columns.status")}</span>
              <span className="text-end">{t("columns.enrollments")}</span>
            </div>
            {courses.map((course) => (
              <Link
                key={course.courseId}
                href={`/${locale}/admin/courses/${course.courseId}`}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-muted"
              >
                <span className="text-foreground">{localized(course.title) || course.courseId}</span>
                <Badge variant={course.status === "published" ? "success" : "neutral"}>
                  {t(`courseStatus.${course.status}`)}
                </Badge>
                <span className="text-end tabular-nums text-foreground/70">{course.enrollmentCount}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
