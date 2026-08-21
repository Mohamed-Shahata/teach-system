import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card, EmptyState } from "@/components/ui";
import type { StudentDetail as StudentAccount } from "@/lib/server/services/studentManagementService";
import type { StudentDetail as StudentEnrollments } from "@/lib/server/services/studentService";
import type { SubscriptionDoc } from "@/lib/server/repositories/subscriptionRepository";
import type { PaymentDoc } from "@/lib/server/repositories/paymentRepository";
import type { LocalizedText } from "@/lib/server/repositories/subjectRepository";

interface StudentAccountViewProps {
  student: StudentAccount;
  enrollments: StudentEnrollments["courses"];
  subscriptions: SubscriptionDoc[];
  payments: PaymentDoc[];
  teacherNames: Map<string, string>;
}

const ENROLLMENT_STATUS_VARIANT: Record<
  StudentEnrollments["courses"][number]["status"],
  "success" | "neutral" | "warning"
> = {
  active: "success",
  completed: "neutral",
  cancelled: "warning",
};

const PAYMENT_STATUS_VARIANT: Record<PaymentDoc["status"], "success" | "neutral" | "warning" | "info"> = {
  pending: "info",
  succeeded: "success",
  confirmed: "success",
  rejected: "warning",
};

function localized(value?: LocalizedText): string {
  return value?.en || value?.ar || "";
}

/**
 * TASK-3307 — Admin's read-only view of one student's account: the same
 * information the student sees about themselves (TASK-3201 profile),
 * plus enrollments (`studentService.getStudentDetail`, unscoped to any
 * one teacher when called without a `teacherId`), subscriptions
 * (`subscriptionService.listForStudent`), and payment history
 * (`paymentService.listForStudentAdmin`) gathered on one page. No edit
 * controls — those stay on `StudentManager`'s existing dialogs.
 */
export async function StudentAccountView({
  student,
  enrollments,
  subscriptions,
  payments,
  teacherNames,
}: StudentAccountViewProps) {
  const t = await getTranslations("adminDashboard.students.profile");
  const format = await getFormatter();

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{student.displayName}</h1>
            <p className="mt-1 text-sm text-foreground/60">{student.email}</p>
            {student.phone && <p className="text-sm text-foreground/60">{student.phone}</p>}
          </div>
          <Badge variant={student.disabled ? "warning" : "success"}>
            {t(student.disabled ? "status.deactivated" : "status.active")}
          </Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {typeof student.age === "number" && (
            <div>
              <dt className="text-xs text-foreground/60">{t("age")}</dt>
              <dd className="text-sm text-foreground/80">{student.age}</dd>
            </div>
          )}
          {student.stageName && (
            <div>
              <dt className="text-xs text-foreground/60">{t("stage")}</dt>
              <dd className="text-sm text-foreground/80">{localized(student.stageName)}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-foreground/60">{t("stats.enrollments")}</dt>
            <dd className="text-lg font-semibold text-foreground">{student.stats.totalEnrollments}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground/60">{t("stats.active")}</dt>
            <dd className="text-lg font-semibold text-foreground">{student.stats.activeEnrollments}</dd>
          </div>
        </dl>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">{t("coursesTitle")}</h2>
        {enrollments.length === 0 ? (
          <EmptyState title={t("coursesEmpty")} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 bg-surface-muted px-4 py-2 text-sm font-medium text-foreground">
              <span>{t("columns.course")}</span>
              <span>{t("columns.status")}</span>
              <span className="text-end">{t("columns.progress")}</span>
              <span className="text-end">{t("columns.enrolledOn")}</span>
            </div>
            {enrollments.map((course) => (
              <div
                key={course.courseId}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="text-foreground">{localized(course.courseTitle ?? undefined) || course.courseId}</span>
                <Badge variant={ENROLLMENT_STATUS_VARIANT[course.status]}>{t(`enrollmentStatus.${course.status}`)}</Badge>
                <span className="text-end tabular-nums text-foreground/70">{course.progress.percent}%</span>
                <span className="text-end text-foreground/60">
                  {format.dateTime(new Date(course.enrollmentDate), { dateStyle: "medium" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">{t("subscriptionsTitle")}</h2>
        {subscriptions.length === 0 ? (
          <EmptyState title={t("subscriptionsEmpty")} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-[1fr_auto] gap-3 bg-surface-muted px-4 py-2 text-sm font-medium text-foreground">
              <span>{t("columns.teacher")}</span>
              <span className="text-end">{t("columns.status")}</span>
            </div>
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-sm">
                <span className="text-foreground">
                  {teacherNames.get(subscription.teacherId) ?? subscription.teacherId}
                </span>
                <Badge variant={subscription.status === "active" ? "success" : "neutral"}>
                  {t(`subscriptionStatus.${subscription.status}`)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">{t("paymentsTitle")}</h2>
        {payments.length === 0 ? (
          <EmptyState title={t("paymentsEmpty")} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-[auto_auto_auto] gap-3 bg-surface-muted px-4 py-2 text-sm font-medium text-foreground">
              <span>{t("columns.amount")}</span>
              <span>{t("columns.status")}</span>
              <span className="text-end">{t("columns.date")}</span>
            </div>
            {payments.map((payment) => (
              <div key={payment.id} className="grid grid-cols-[auto_auto_auto] items-center gap-3 px-4 py-3 text-sm">
                <span className="text-foreground tabular-nums">
                  {payment.amount} {payment.currency}
                </span>
                <Badge variant={PAYMENT_STATUS_VARIANT[payment.status]}>{t(`paymentStatus.${payment.status}`)}</Badge>
                <span className="text-end text-foreground/60">
                  {format.dateTime(new Date(payment.createdAt), { dateStyle: "medium" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
