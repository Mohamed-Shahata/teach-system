import { getFormatter, getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { scheduleService } from "@/lib/server/services/scheduleService";
import { paymentService } from "@/lib/server/services/paymentService";
import { subscriptionInvoiceService } from "@/lib/server/services/subscriptionInvoiceService";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { notificationService } from "@/lib/server/services/notificationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleManager } from "@/components/teacher/schedule-manager";
import { PaymentsQueue } from "@/components/teacher/payments-queue";
import { SubscriptionInvoicesPanel } from "@/components/teacher/subscription-invoices-panel";
import { ClassReminderBanner } from "@/components/teacher/class-reminder-banner";

/**
 * Teacher overview stats for TASK-702. Counters are denormalized on
 * `teacherProfiles.stats`; feature services increment them as the
 * corresponding collections land in later phases.
 */
export default async function TeacherDashboardPage() {
  const t = await getTranslations("teacherDashboard");
  const format = await getFormatter();
  const session = await requireSession();
  assertRole(session, "teacher");

  const stats = await teacherProfileRepository.findStatsByTeacherId(session.uid);
  const scheduleSlots = await scheduleService.listSchedule(session);
  const [teacherProfile, allSubjects, stages] = await Promise.all([
    teacherProfileRepository.findByTeacherId(session.uid),
    centerConfigService.listSubjects(session),
    centerConfigService.listEducationStages(session),
  ]);
  // A teacher may teach more than one assigned subject (`teacherProfiles.
  // subjectIds`, set by an Admin -- TASK-2402) -- the schedule form's
  // Subject picker is limited to those, not every subject in the center.
  const subjects = teacherProfile?.subjectIds && teacherProfile.subjectIds.length > 0
    ? allSubjects.filter((subject) => teacherProfile.subjectIds!.includes(subject.id))
    : allSubjects;
  const pendingPayments = (await paymentService.listForTeacher(session, "pending")).filter(
    (payment) => payment.method === "vodafone_cash" || payment.method === "bank_transfer",
  );
  const subscriptionInvoices = await subscriptionInvoiceService.listForTeacher(session);
  const classReminders = await notificationService.listMyClassReminders(session);
  const cards = [
    {
      key: "students",
      value: stats.totalStudents,
      tone: "bg-primary/15 text-primary",
      icon: (
        <path
          d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6.5-1a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM9 13c-2.9 0-6 1.46-6 3.5V19h12v-2.5c0-2.04-3.1-3.5-6-3.5Zm7.5.2c1.9.32 3.5 1.35 3.5 3.3V19h-3v-2.5c0-1.15-.48-2.06-1.28-2.77.27-.02.53-.03.78-.03Z"
          fill="currentColor"
        />
      ),
    },
    {
      key: "courses",
      value: stats.totalCourses,
      tone: "bg-secondary/15 text-secondary",
      icon: (
        <path
          d="M4 5.5C4 4.67 4.67 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Zm9-1.5h6.5c.83 0 1.5.67 1.5 1.5v13c0 .83-.67 1.5-1.5 1.5H13V4Z"
          fill="currentColor"
        />
      ),
    },
    {
      key: "publishedCourses",
      value: stats.totalPublishedCourses,
      tone: "bg-warning/15 text-warning",
      icon: (
        <path
          d="M11 3.5 5.5 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.5L11 20.5V3.5Zm5.7 3.8-1.4 1.4a5 5 0 0 1 0 6.6l1.4 1.4a7 7 0 0 0 0-9.4Zm-3-1.4L12.3 7.3a2.5 2.5 0 0 1 0 3.6l1.4 1.4a4.5 4.5 0 0 0 0-6.4Z"
          fill="currentColor"
        />
      ),
    },
    {
      key: "lessons",
      value: stats.totalLessons,
      tone: "bg-foreground/10 text-foreground",
      icon: (
        <path
          d="M6 3.5A1.5 1.5 0 0 0 4.5 5v14A1.5 1.5 0 0 0 6 20.5h12A1.5 1.5 0 0 0 19.5 19V8.62c0-.4-.16-.78-.44-1.06l-4.12-4.12a1.5 1.5 0 0 0-1.06-.44H6Zm7 1.06 4 4H13.5a.5.5 0 0 1-.5-.5V4.56ZM7.5 12h9v1.5h-9V12Zm0 3.5h9V17h-9v-1.5Z"
          fill="currentColor"
        />
      ),
    },
    {
      key: "enrollments",
      value: stats.totalEnrollments,
      tone: "bg-error/15 text-error",
      icon: (
        <path
          d="M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.66-8 5v2h13v-2c0-1.24-.72-2.25-1.78-3.05C12.5 15.28 11.24 14 10 14Zm8.5-3v-2.5H21V7h-2.5V4.5H17V7h-2.5v1.5H17v2.5h1.5Z"
          fill="currentColor"
        />
      ),
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("nav.overview")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("overviewSubtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.key} className="min-h-36">
            <CardHeader className="mb-5 flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground/70">
                {t(`stats.${card.key}`)}
              </CardTitle>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${card.tone}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
                  {card.icon}
                </svg>
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{format.number(card.value)}</p>
              <p className="mt-1 text-xs text-foreground/60">{t(`statsCaptions.${card.key}`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ScheduleManager initialSlots={scheduleSlots} subjects={subjects} stages={stages} />

      <ClassReminderBanner initialReminders={classReminders} />

      <PaymentsQueue initialPayments={pendingPayments} />

      <SubscriptionInvoicesPanel initialInvoices={subscriptionInvoices} />
    </div>
  );
}
