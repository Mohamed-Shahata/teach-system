import { getFormatter, getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { scheduleService } from "@/lib/server/services/scheduleService";
import { paymentService } from "@/lib/server/services/paymentService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleManager } from "@/components/teacher/schedule-manager";
import { PaymentsQueue } from "@/components/teacher/payments-queue";

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
  const pendingPayments = (await paymentService.listForTeacher(session, "pending")).filter(
    (payment) => payment.method === "vodafone_cash" || payment.method === "bank_transfer",
  );
  const cards = [
    { key: "students", value: stats.totalStudents, tone: "bg-blue-50 text-blue-700" },
    { key: "courses", value: stats.totalCourses, tone: "bg-indigo-50 text-indigo-700" },
    { key: "publishedCourses", value: stats.totalPublishedCourses, tone: "bg-amber-50 text-amber-700" },
    { key: "lessons", value: stats.totalLessons, tone: "bg-slate-100 text-slate-700" },
    { key: "enrollments", value: stats.totalEnrollments, tone: "bg-rose-50 text-rose-700" },
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
              <span className={`grid h-9 w-9 place-items-center rounded-full ${card.tone}`} aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-current" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{format.number(card.value)}</p>
              <p className="mt-1 text-xs text-foreground/60">{t(`statsCaptions.${card.key}`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ScheduleManager initialSlots={scheduleSlots} />

      <PaymentsQueue initialPayments={pendingPayments} />
    </div>
  );
}
