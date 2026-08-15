import { z } from "zod";

/**
 * Shared localized-text (`{ en, ar }`) building blocks — used by any
 * schema with a bilingual title/description/label field (`course`,
 * `lesson`, `schedule`, ...). Pulled out here per
 * `development/coding-rules.md` "No Duplicate Functionality" once a
 * second schema needed the same shape `course.schema.ts` had inlined.
 */
export const localizedRequiredTextSchema = z.object({
  en: z.string().trim().min(3).max(120),
  ar: z.string().trim().min(3).max(120),
});

export const localizedOptionalTextSchema = z.object({
  en: z.string().trim().max(2000).optional(),
  ar: z.string().trim().max(2000).optional(),
});
