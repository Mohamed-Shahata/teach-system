"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { NotificationDoc } from "@/lib/server/repositories/notificationRepository";

interface ClassReminderBannerProps {
  initialReminders: NotificationDoc[];
}

/**
 * TASK-2003/2004 — the teacher-facing counterpart to
 * `components/student/meeting-notifications.tsx`. Shows the automatic
 * pre-class reminders fired by the cron job
 * (`lib/server/jobs/classNotificationsJob.ts`) shortly before each of the
 * teacher's own slots starts — a nudge to set/check `meetingUrl` before
 * students start arriving. Dismissing one marks it read; it doesn't
 * navigate anywhere (unlike the student's "Join" button) since this is a
 * reminder for the teacher's own action, not a link to open.
 */
export function ClassReminderBanner({ initialReminders }: ClassReminderBannerProps) {
  const t = useTranslations("teacherDashboard.classReminders");
  const [reminders, setReminders] = React.useState(initialReminders);

  // TASK-2004 — poll for new reminders (TASK-2003 fires them on a timer,
  // not on a click) so the banner doesn't need a page reload to update.
  React.useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/teacher/notifications");
        if (!res.ok) return;
        const data = (await res.json()) as { notifications: NotificationDoc[] };
        setReminders(data.notifications);
      } catch {
        // Best-effort — keep showing the last known list on a failed poll.
      }
    }, 45_000);
    return () => clearInterval(interval);
  }, []);

  async function dismiss(id: string) {
    setReminders((current) => current.filter((r) => r.id !== id));
    try {
      await fetch(`/api/teacher/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    } catch {
      // Best-effort — the banner still clears client-side even if the
      // read-state write fails.
    }
  }

  if (reminders.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              {!reminder.read && <Badge variant="warning">{t("new")}</Badge>}
              <span className="text-sm text-foreground">{t("message", { subject: reminder.subjectId })}</span>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => dismiss(reminder.id)}>
              {t("dismiss")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
