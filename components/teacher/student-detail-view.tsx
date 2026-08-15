import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card, EmptyState } from "@/components/ui";
import type { StudentDetail } from "@/lib/server/services/studentService";

interface StudentDetailViewProps {
  student: StudentDetail;
}

const STATUS_VARIANT: Record<StudentDetail["courses"][number]["status"], "success" | "neutral" | "warning"> = {
  active: "success",
  completed: "neutral",
  cancelled: "warning",
};

/**
 * TASK-1002 — read-only detail view: student profile header + one row per
 * enrolled course with its progress. Server component (no interactivity
 * needed yet — confirm/reject-style actions aren't part of this task).
 * Quiz results are intentionally omitted; see `studentService`'s doc
 * comment for why.
 */
export async function StudentDetailView({ student }: StudentDetailViewProps) {
  const t = await getTranslations("teacherDashboard.students.detail");
  const format = await getFormatter();

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{student.displayName}</h1>
            <p className="mt-1 text-sm text-foreground/60">{student.email}</p>
          </div>
          {student.stageId && <Badge variant="info">{student.stageId}</Badge>}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">{t("coursesTitle")}</h2>
        {student.courses.length === 0 ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 bg-surface-muted px-4 py-2 text-sm font-medium text-foreground">
              <span>{t("columns.course")}</span>
              <span>{t("columns.status")}</span>
              <span className="text-end">{t("columns.progress")}</span>
              <span className="text-end">{t("columns.enrolledOn")}</span>
            </div>
            {student.courses.map((course) => (
              <div
                key={course.courseId}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="text-foreground">
                  {course.courseTitle?.en || course.courseTitle?.ar || course.courseId}
                </span>
                <Badge variant={STATUS_VARIANT[course.status]}>{t(`status.${course.status}`)}</Badge>
                <span className="text-end tabular-nums text-foreground/70">
                  {t("progressValue", { percent: course.progress.percent })}
                </span>
                <span className="text-end text-foreground/60">
                  {format.dateTime(new Date(course.enrollmentDate), { dateStyle: "medium" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
