import { z } from "zod";
import { localizedRequiredTextSchema } from "@/lib/validation/common.schema";

export const educationStageCategorySchema = z.enum(["nursery", "primary", "prep", "secondary"]);

export const createEducationStageSchema = z.object({
  name: localizedRequiredTextSchema,
  category: educationStageCategorySchema,
  order: z.coerce.number().int().min(0),
});
export type CreateEducationStageInput = z.infer<typeof createEducationStageSchema>;

export const updateEducationStageSchema = createEducationStageSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "errors.validation" });
export type UpdateEducationStageInput = z.infer<typeof updateEducationStageSchema>;

export const createSubjectSchema = z.object({
  name: localizedRequiredTextSchema,
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const updateSubjectSchema = createSubjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "errors.validation" });
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
