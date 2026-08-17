import { z } from "zod";

/** `POST` body for `/api/notifications/fcm-tokens` (TASK-2602). */
export const registerFcmTokenSchema = z.object({
  token: z.string().min(1),
  userAgent: z.string().max(512).optional(),
});
export type RegisterFcmTokenInput = z.infer<typeof registerFcmTokenSchema>;
