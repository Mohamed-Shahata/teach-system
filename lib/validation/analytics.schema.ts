import { z } from "zod";

/**
 * TASK-3304 — the Analytics page's single date-range filter. Query-param
 * validation for `GET /api/admin/analytics?granularity=`, same
 * enum-then-parse pattern as `paymentStatusSchema` in `payment.schema.ts`.
 */
export const analyticsGranularitySchema = z.enum(["month", "year", "5year"]);
export type AnalyticsGranularityInput = z.infer<typeof analyticsGranularitySchema>;
