import { z } from "zod";

/** `POST /api/admin/students/{studentId}/subscriptions` body. */
export const createSubscriptionSchema = z.object({
  teacherId: z.string().min(1),
  offeringId: z.string().min(1),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
