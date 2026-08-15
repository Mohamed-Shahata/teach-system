import { z } from "zod";

/**
 * Payment schemas — TASK-1104. See `docs/features/payments.md` and
 * `docs/database/collections.md` (`payments/{paymentId}`) for the full
 * state machine and field notes.
 */

export const paymentMethodSchema = z.enum(["card", "fawry", "vodafone_cash", "bank_transfer"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentStatusSchema = z.enum(["pending", "succeeded", "confirmed", "rejected"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const manualPaymentMethodSchema = z.enum(["vodafone_cash", "bank_transfer"]);
export const onlinePaymentMethodSchema = z.enum(["card", "fawry"]);

/**
 * Body for the (future, TASK-1105/1106) student-facing "pay for a course"
 * endpoint. Not consumed by this task — `amount`/`currency`/`teacherId`
 * are never taken from the client (per `features/payments.md`'s security
 * notes), only `courseId` and the chosen `method`; the service resolves
 * the rest server-side from the course's own stored price. Exported now so
 * TASK-1105/1106 don't have to invent it, and so `paymentService.createPayment`
 * has a typed input.
 */
export const createPaymentSchema = z.object({
  courseId: z.string().min(1),
  method: paymentMethodSchema,
  referenceNote: z.string().trim().max(200).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

/** Body for `PATCH` confirm/reject of a manual payment (teacher/admin review). */
export const reviewPaymentSchema = z.object({
  status: z.enum(["confirmed", "rejected"]),
});
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;
