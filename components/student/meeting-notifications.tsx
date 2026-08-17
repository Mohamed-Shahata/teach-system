"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { NotificationDoc } from "@/lib/server/repositories/notificationRepository";

interface MeetingNotificationsProps {
  initialNotifications: NotificationDoc[];
}

/**
 * TASK-1602 (Phase 6, item 18's receiving end) — shows the meeting links a
 * student's teachers have sent them, most recent first, with an unread
 * badge. Clicking "Join" opens the link and marks the notification read.
 */
export function MeetingNotifications({ initialNotifications }: MeetingNotificationsProps) {
  const t = useTranslations("studentDashboard.meetingNotifications");
  const locale = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(initialNotifications);

  // TASK-2004 — poll for new auto-fired notifications (TASK-2002) since
  // they no longer only appear after a manual click; the initial
  // server-rendered list can go stale while the tab stays open.
  React.useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/student/notifications");
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
      await fetch(`/api/student/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    } catch {
      // Best-effort — the link still opens even if marking read fails.
    }
  }

  // TASK-3002 — clicking the row itself marks read and navigates to the
  // notification's `link` (the teacher's page); "Join" stays a separate,
  // more specific action (opens the actual meeting URL in a new tab) and
  // stops propagation so it doesn't also trigger the row-level navigation.
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
        {notifications.map((notification) => (
          <div
            key={notification.id}
            role={notification.link ? "button" : undefined}
            tabIndex={notification.link ? 0 : undefined}
            onClick={notification.link ? () => openNotification(notification) : undefined}
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
              <span className="text-sm text-foreground">{t("message", { subject: notification.subjectId ?? "" })}</span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                markRead(notification.id);
                window.open(notification.meetingUrl, "_blank", "noopener,noreferrer");
              }}
            >
              {t("join")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
