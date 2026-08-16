"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
  const [notifications, setNotifications] = React.useState(initialNotifications);

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
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              {!notification.read && <Badge variant="info">{t("new")}</Badge>}
              <span className="text-sm text-foreground">{t("message", { subject: notification.subjectId })}</span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
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
