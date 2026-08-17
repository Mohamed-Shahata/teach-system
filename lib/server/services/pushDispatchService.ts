import "server-only";
import { pushRepository } from "@/lib/server/repositories/pushRepository";
import { fcmTokenRepository } from "@/lib/server/repositories/fcmTokenRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import type { NotificationDoc } from "@/lib/server/repositories/notificationRepository";

/**
 * TASK-2603 — server-side push dispatch. Called right after every write
 * to `notifications` (`notificationService.sendMeetingLink`'s manual send,
 * and Phase 20's automated `classNotificationsJob`), so it takes the same
 * `NotificationDoc[]` those callers just created and best-effort delivers
 * one FCM push per recipient device on top of the in-app bell.
 *
 * Deliberately never throws: a push failure (no tokens, FCM outage, every
 * token expired) must never fail the notification write it's piggybacking
 * on — the in-app bell entry is the source of truth, push is a bonus
 * delivery channel. Errors are swallowed per-recipient so one bad
 * recipient can't stop the rest of the batch from being notified.
 *
 * FCM error codes that mean "this token is dead, stop sending to it" are
 * pruned from `users/{uid}/fcmTokens` — the cleanup path `collections.md`
 * and TASK-2602 both call out as this task's job.
 */

const DEAD_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/** Server-generated push copy — not a client-visible next-intl string (nothing under `messages/` renders it), so it's kept local to this module rather than added to `messages/en.json`/`ar.json`. Localized off `users/{uid}.locale`, defaulting to `en` when unset. */
const PUSH_COPY: Record<"en" | "ar", Record<NotificationDoc["type"], { title: string; body: string }>> = {
  en: {
    meeting_link: { title: "Class is starting", body: "Your class is starting now — tap to join." },
    class_reminder: { title: "Upcoming class", body: "Your class starts in a few minutes." },
  },
  ar: {
    meeting_link: { title: "بدأت الحصة", body: "حصتك تبدأ الآن — اضغط للانضمام." },
    class_reminder: { title: "تذكير بالحصة القادمة", body: "حصتك تبدأ خلال دقائق قليلة." },
  },
};

export const pushDispatchService = {
  /** Best-effort — swallows all errors so a caller never needs its own try/catch. */
  async dispatchForNotifications(notifications: NotificationDoc[]): Promise<void> {
    if (notifications.length === 0) return;

    const recipientIds = Array.from(new Set(notifications.map((n) => n.recipientId)));
    const users = await userRepository.findByIds(recipientIds);

    await Promise.all(
      notifications
        // TASK-2604/TASK-3001 — the recipient opted out of OS-level push.
        // Students can no longer opt out (TASK-3001: notifications are
        // mandatory-on for students, the toggle was removed from student
        // settings) — `pushEnabled` on a student doc is never read here.
        // Teachers/admins keep the opt-out: `undefined` means "never
        // toggled" and defaults to enabled (see `UserDoc.pushEnabled`).
        .filter((notification) => {
          const recipient = users.get(notification.recipientId);
          if (recipient?.role === "student") return true;
          return recipient?.pushEnabled !== false;
        })
        .map((notification) => this.dispatchOne(notification, users.get(notification.recipientId)?.locale)),
    );
  },

  /** One notification -> one recipient's registered devices. Isolated per-notification so one recipient's failure never affects another's. */
  async dispatchOne(notification: NotificationDoc, locale: "en" | "ar" | undefined): Promise<void> {
    try {
      const tokens = await fcmTokenRepository.listForUser(notification.recipientId);
      if (tokens.length === 0) return;

      const copy = PUSH_COPY[locale ?? "en"][notification.type];
      const results = await pushRepository.sendMulticast(
        tokens.map((t) => t.token),
        {
          title: copy.title,
          body: copy.body,
          data: {
            type: notification.type,
            scheduleId: notification.scheduleId,
            ...(notification.meetingUrl ? { meetingUrl: notification.meetingUrl } : {}),
          },
        },
      );

      const deadTokenIds = results
        .filter((r) => !r.success && r.errorCode && DEAD_TOKEN_ERROR_CODES.has(r.errorCode))
        .map((r) => tokens.find((t) => t.token === r.token)?.id)
        .filter((id): id is string => Boolean(id));

      await Promise.all(deadTokenIds.map((id) => fcmTokenRepository.remove(notification.recipientId, id)));
    } catch {
      // Best-effort delivery channel — never let a push failure surface to the caller.
    }
  },
};
