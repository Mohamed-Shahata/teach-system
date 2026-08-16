import { getFormatter, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { systemStatsService } from "@/lib/server/services/systemStatsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * TASK-1902 — System-wide stats overview. Counters are denormalized on
 * `systemStats/global`; feature services increment them as the
 * corresponding events happen (`accountService`, `courseService`,
 * `lessonService`, `enrollmentService`) — same pattern and layout as
 * `teacher/dashboard/page.tsx` (TASK-702), just center-wide instead of
 * per-teacher.
 */
export default async function AdminDashboardPage() {
  const t = await getTranslations("adminDashboard");
  const format = await getFormatter();
  const session = await requireSession();
  assertRole(session, "admin");

  const stats = await systemStatsService.getStats(session);
  const cards = [
    {
      key: "teachers",
      value: stats.totalTeachers,
      tone: "bg-primary/15 text-primary",
      icon: (
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-3.5 3.6-6 8-6s8 2.5 8 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    },
    {
      key: "students",
      value: stats.totalStudents,
      tone: "bg-secondary/15 text-secondary",
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
      tone: "bg-warning/15 text-warning",
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
      tone: "bg-foreground/10 text-foreground",
      icon: (
        <path
          d="M11 3.5 5.5 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.5L11 20.5V3.5Zm5.7 3.8-1.4 1.4a5 5 0 0 1 0 6.6l1.4 1.4a7 7 0 0 0 0-9.4Zm-3-1.4L12.3 7.3a2.5 2.5 0 0 1 0 3.6l1.4 1.4a4.5 4.5 0 0 0 0-6.4Z"
          fill="currentColor"
        />
      ),
    },
    {
      key: "lessons",
      value: stats.totalPublishedLessons,
      tone: "bg-error/15 text-error",
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
      tone: "bg-primary/15 text-primary",
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
