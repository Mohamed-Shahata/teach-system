import "server-only";
import { notificationRepository, type CreateNotificationDoc } from "@/lib/server/repositories/notificationRepository";
import { pushDispatchService } from "@/lib/server/services/pushDispatchService";

export type AuditAction = "created" | "updated" | "deleted";

export interface AuditNotifyInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  /** Localized copy — kept simple `{ en, ar }` strings rather than a `next-intl` key, since the entity/action space is open-ended (see TASK-3003). */
  title: { en: string; ar: string };
  /** One doc per recipient, deduped. */
  recipientIds: string[];
  /** Relative in-app path (no locale prefix) — same convention as `NotificationDoc.link` (TASK-3002). */
  link?: string;
}

/**
 * TASK-3003 — a single centralized entry point for "something changed,
 * tell the people who should know" so every mutating service calls one
 * helper instead of hand-writing `notificationRepository.createMany`
 * calls (~40 call sites otherwise). Deliberately thin: callers decide
 * *who* the recipients are (their own confirmation, the owning
 * teacher/Admin, etc.) — this only writes the docs and best-effort
 * pushes them, same as `notificationService.sendMeetingLink` does for
 * `meeting_link`.
 *
 * Never throws — a notification failure must never fail the mutation
 * it's reporting on, same reasoning as `pushDispatchService` being
 * best-effort. Callers `await` it (not fire-and-forget) so ordering in
 * tests stays deterministic, but errors are swallowed here.
 */
export const auditNotificationService = {
  async notify(input: AuditNotifyInput): Promise<void> {
    try {
      const recipientIds = Array.from(new Set(input.recipientIds));
      if (recipientIds.length === 0) return;

      const now = Date.now();
      const docs: CreateNotificationDoc[] = recipientIds.map((recipientId) => ({
        recipientId,
        type: "audit" as const,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        ...(input.link ? { link: input.link } : {}),
        read: false,
        createdAt: now,
      }));

      const created = await notificationRepository.createMany(docs);
      await pushDispatchService.dispatchForNotifications(created);
    } catch {
      // Best-effort — see module docstring.
    }
  },
};
