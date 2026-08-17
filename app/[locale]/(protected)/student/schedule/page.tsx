import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { studentScheduleService, type StudentScheduleSlot } from "@/lib/server/services/studentScheduleService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

/**
 * TASK-3205 — student weekly schedule: every recurring `schedule` slot
 * from every teacher the student holds an active subscription with
 * (`studentScheduleService.listMySchedule`), laid out as a 7-column
 * timetable (days as columns, matching `docs/design-system`'s card/grid
 * tokens rather than a generic table). Read-only — no client
 * interactivity needed, so this stays a server component, unlike the
 * teacher's `schedule-manager.tsx` which also creates/edits slots.
 */

function formatTime12h(time: string, format: Awaited<ReturnType<typeof getFormatter>>): string {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(Date.UTC(2024, 0, 1, hours, minutes));
  return format.dateTime(date, { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
}

function groupByDay(slots: StudentScheduleSlot[]): StudentScheduleSlot[][] {
  const days: StudentScheduleSlot[][] = Array.from({ length: 7 }, () => []);
  for (const slot of slots) {
    days[slot.dayOfWeek]?.push(slot);
  }
  return days;
}

export default async function StudentSchedulePage() {
  const t = await getTranslations("studentSchedule");
  const format = await getFormatter();
  const locale = await getLocale();
  const session = await requireSession();
  assertRole(session, "student");

  const slots = await studentScheduleService.listMySchedule(session);
  const dayLabels = Array.from({ length: 7 }, (_, day) =>
    format.dateTime(new Date(Date.UTC(2024, 0, day + 7)), { weekday: "long", timeZone: "UTC" }),
  );
  const days = groupByDay(slots);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      {slots.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7" dir={locale === "ar" ? "rtl" : "ltr"}>
          {days.map((daySlots, day) => (
            <div key={day} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground/80">{dayLabels[day]}</p>
              {daySlots.length === 0 ? (
                <p className="text-xs text-foreground/40">—</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {daySlots.map((slot) => (
                    <Card key={slot.id}>
                      <CardContent className="flex flex-col gap-1.5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {formatTime12h(slot.startTime, format)}
                          </span>
                          <Badge variant="neutral">{t("duration", { count: slot.durationMinutes })}</Badge>
                        </div>
                        {slot.subjectName && (
                          <p className="truncate text-sm text-foreground/80">
                            {(locale === "ar" ? slot.subjectName.ar : slot.subjectName.en) ?? slot.subjectName.en}
                          </p>
                        )}
                        <p className="truncate text-xs text-foreground/60">{slot.teacherName}</p>
                        {slot.label && (slot.label.en || slot.label.ar) && (
                          <p className="truncate text-xs text-foreground/50">
                            {(locale === "ar" ? slot.label.ar : slot.label.en) ?? slot.label.en}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
