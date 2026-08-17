"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { NotificationDoc } from "@/lib/server/repositories/notificationRepository";

interface AuditNotificationsPanelProps {
  initialNotifications: NotificationDoc[];
}

/**
 * TASK-3003 — role-agnostic panel for the generic `audit` notification
 * trail (course/lesson/enrollment/payment create-update-delete, etc.).
 * Mounted on all three dashboards (`teacher`, `student`, `admin`) since
 * `auditNotificationService` can address any role. Deliberately separate
 * from `MeetingNotifications`/`ClassReminderBanner` (TASK-1602/TASK-2003),
 * which stay scoped to their own dedicated `meeting_link`/`class_reminder`
 * shapes and click behavior.
 */
export function AuditNotificationsPanel({ initialNotifications }: AuditNotificationsPanelProps) {
  const t = useTranslations("layout.auditNotifications");
  const locale = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(initialNotifications);

  React.useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/notifications/mine");
        if (!res.ok) return;
        const data = (await res.json()) as { notifications: NotificationDoc[] };
        setNotifications(data.notifications);
      } catch {
        // Best-effort — keep showing the last known list on a failed poll.
      }
    }, 45_000);
    return () => clearInterval(interval);
  }, []);

  async function markRead(id: string) {
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch(`/api/notifications/mine/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    } catch {
      // Best-effort — the row still navigates even if marking read fails.
    }
  }

  function openNotification(notification: NotificationDoc) {
    markRead(notification.id);
    if (notification.link) {
      router.push(`/${locale}${notification.link}`);
    }
  }

  if (notifications.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {notifications.slice(0, 10).map((notification) => (
          <div
            key={notification.id}
            role={notification.link ? "button" : undefined}
            tabIndex={notification.link ? 0 : undefined}
            onClick={notification.link ? () => openNotification(notification) : () => markRead(notification.id)}
            onKeyDown={
              notification.link
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openNotification(notification);
                    }
                  }
                : undefined
            }
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 [&[role=button]]:cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {!notification.read && <Badge variant="info">{t("new")}</Badge>}
              <span className="text-sm text-foreground">
                {locale === "ar" ? notification.title?.ar ?? notification.title?.en : notification.title?.en}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
