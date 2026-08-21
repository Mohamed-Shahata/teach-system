import { z } from "zod";

/**
 * `POST /api/admin/payments/manual-subscription` body — TASK-3402. The
 * one-action "student pays cash for teacher's offering, this month" flow.
 */
export const manualSubscriptionPaymentSchema = z.object({
  studentId: z.string().min(1),
  teacherId: z.string().min(1),
  offeringId: z.string().min(1),
  /** Billing period, `YYYY-MM`. Defaults to the current month server-side if omitted. */
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});
export type ManualSubscriptionPaymentInput = z.infer<typeof manualSubscriptionPaymentSchema>;
