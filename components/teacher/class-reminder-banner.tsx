"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
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
 * students start arriving. Clicking a row marks it read and navigates to
 * its `link` (TASK-3002, the teacher's dashboard/schedule); "Dismiss" is
 * the separate, no-navigate acknowledge action that also removes it from
 * this list.
 */
export function ClassReminderBanner({ initialReminders }: ClassReminderBannerProps) {
  const t = useTranslations("teacherDashboard.classReminders");
  const locale = useLocale();
  const router = useRouter();
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

  /**
   * TASK-3005 — sends `acknowledged: true` (not `read: true`), which
   * also excludes it from `listByTeacherRecipient`'s server-side query
   * going forward — unlike a plain `read` flip, this is why the reminder
   * doesn't reappear on the next 45s poll.
   */
  async function dismiss(id: string) {
    setReminders((current) => current.filter((r) => r.id !== id));
    try {
      await fetch(`/api/teacher/notifications/${id}/acknowledge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledged: true }),
      });
    } catch {
      // Best-effort — the banner still clears client-side even if the
      // acknowledge write fails.
    }
  }

  // TASK-3002 — clicking the row marks read (without removing it from the
  // list, unlike "Dismiss") and navigates to `link` (the teacher's own
  // dashboard/schedule). "Dismiss" stays the no-navigate acknowledge action
  // and stops propagation so it doesn't also trigger the row navigation.
  function openReminder(reminder: NotificationDoc) {
    void markRead(reminder.id);
    if (reminder.link) {
      router.push(`/${locale}${reminder.link}`);
    }
  }

  async function markRead(id: string) {
    setReminders((current) => current.map((r) => (r.id === id ? { ...r, read: true } : r)));
    try {
      await fetch(`/api/teacher/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    } catch {
      // Best-effort — navigation still happens even if marking read fails.
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
            role={reminder.link ? "button" : undefined}
            tabIndex={reminder.link ? 0 : undefined}
            onClick={reminder.link ? () => openReminder(reminder) : undefined}
            onKeyDown={
              reminder.link
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openReminder(reminder);
                    }
                  }
                : undefined
            }
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 [&[role=button]]:cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {!reminder.read && <Badge variant="warning">{t("new")}</Badge>}
              <span className="text-sm text-foreground">{t("message", { subject: reminder.subjectId ?? "" })}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={(event) => {
                event.stopPropagation();
                dismiss(reminder.id);
              }}
            >
              {t("dismiss")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
