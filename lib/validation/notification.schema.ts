import { z } from "zod";

/**
 * `PATCH /api/student/notifications/[notificationId]` body — the only
 * client-writable field on a notification is `read` (marking it seen).
 * Everything else is server-derived at creation time (Phase 6, TASK-1602).
 */
export const markNotificationReadSchema = z.object({
  read: z.literal(true),
});
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;

/** `PATCH /api/teacher/notifications/[notificationId]/acknowledge` body (TASK-3005) — same one-literal-field shape as `markNotificationReadSchema`, kept as its own schema since it's a semantically distinct action (see `notificationRepository.acknowledge`). */
export const acknowledgeNotificationSchema = z.object({
  acknowledged: z.literal(true),
});
export type AcknowledgeNotificationInput = z.infer<typeof acknowledgeNotificationSchema>;
