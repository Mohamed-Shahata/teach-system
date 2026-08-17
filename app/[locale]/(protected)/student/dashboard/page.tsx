import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { enrollmentService } from "@/lib/server/services/enrollmentService";
import { notificationService } from "@/lib/server/services/notificationService";
import { subscriptionInvoiceService } from "@/lib/server/services/subscriptionInvoiceService";
import { courseRepository, type LocalizedText } from "@/lib/server/repositories/courseRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { MeetingNotifications } from "@/components/student/meeting-notifications";
import { SubscriptionInvoicesPanel } from "@/components/student/subscription-invoices-panel";

/**
 * TASK-1103 — the student's own courses, each with a progress bar built
 * from `enrollment.progress.percent` (server-derived in
 * `enrollmentService.markLessonComplete`, TASK-1101/1102 — never
 * client-writable). Read-only: marking a lesson complete happens from
 * the lesson view itself (future `student/courses/[courseId]/*`,
 * folder-structure.md), not from this list.
 */

const STATUS_BADGE: Record<string, BadgeVariant> = {
  active: "info",
  completed: "success",
  cancelled: "neutral",
};

function localizedTitle(title: LocalizedText, locale: string): string {
  return (locale === "ar" ? title.ar : title.en) || title.en || title.ar;
}

export default async function StudentDashboardPage() {
  const t = await getTranslations("studentDashboard");
  const locale = await getLocale();
  const session = await requireSession();
  assertRole(session, "student");

  const enrollments = await enrollmentService.listMyEnrollments(session);
  const courses = await courseRepository.findByIds(enrollments.map((enrollment) => enrollment.courseId));
  const notifications = await notificationService.listMyNotifications(session);
  const subscriptionInvoices = await subscriptionInvoiceService.listForStudent(session);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      <MeetingNotifications initialNotifications={notifications} />

      <SubscriptionInvoicesPanel invoices={subscriptionInvoices} />

      {enrollments.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {enrollments.map((enrollment) => {
            const course = courses.get(enrollment.courseId);
            const title = course ? localizedTitle(course.title, locale) : t("unknownCourse");
            const percent = enrollment.progress.percent;

            return (
              <Card key={enrollment.id} className="flex flex-col gap-3">
                <CardHeader className="mb-0 flex-row items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2">{title}</CardTitle>
                  <Badge variant={STATUS_BADGE[enrollment.status] ?? "neutral"}>
                    {t(`status.${enrollment.status}`)}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t("progressLabel")}
                    className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-foreground/60">
                    {t("progressCaption", {
                      percent,
                      completed: enrollment.progress.completedLessonIds.length,
                    })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
