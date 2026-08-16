import { z } from "zod";

/**
 * Subscription invoice schemas — Phase 3. A `subscriptionInvoices/{id}` doc
 * is one month's bill for one `subscriptions/{subscriptionId}` (see
 * `subscriptionInvoiceRepository`). Reuses the same manual-review method
 * set as course `payments` (`paymentService`) rather than inventing a new
 * payment vocabulary.
 */

export const invoicePaymentMethodSchema = z.enum(["cash", "vodafone_cash", "bank_transfer"]);
export type InvoicePaymentMethod = z.infer<typeof invoicePaymentMethodSchema>;

export const invoiceStatusSchema = z.enum(["pending", "confirmed", "rejected"]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

/** `POST /api/admin/subscriptions/{subscriptionId}/invoices` body. */
export const generateInvoiceSchema = z.object({
  /** Billing period, `YYYY-MM`. Defaults to the current month server-side if omitted. */
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;

/** `PATCH /api/admin/subscription-invoices/{invoiceId}` body — manual review. */
export const reviewInvoiceSchema = z.object({
  status: z.enum(["confirmed", "rejected"]),
  method: invoicePaymentMethodSchema.optional(),
  referenceNote: z.string().trim().max(200).optional(),
});
export type ReviewInvoiceInput = z.infer<typeof reviewInvoiceSchema>;
