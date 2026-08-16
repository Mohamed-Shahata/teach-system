import { z } from "zod";

/**
 * `teacherOfferings` schemas — Admin prices one of a teacher's subjects
 * per grade level (e.g. "Physics, Grade 3 Secondary" -> monthly price).
 * See `lib/server/repositories/teacherOfferingRepository.ts`.
 */

const idField = z.string().min(1);
/** Whole-currency monthly price (EGP, no decimals) — must be a positive amount. */
const monthlyPriceField = z.number().int().positive().max(1_000_000);

export const createTeacherOfferingSchema = z.object({
  subjectId: idField,
  stageId: idField,
  monthlyPrice: monthlyPriceField,
});
export type CreateTeacherOfferingInput = z.infer<typeof createTeacherOfferingSchema>;

export const updateTeacherOfferingSchema = z.object({
  monthlyPrice: monthlyPriceField,
});
export type UpdateTeacherOfferingInput = z.infer<typeof updateTeacherOfferingSchema>;
