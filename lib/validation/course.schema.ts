import { z } from "zod";
import { localizedOptionalTextSchema, localizedRequiredTextSchema } from "@/lib/validation/common.schema";

export const courseStatusSchema = z.enum(["draft", "published"]);
export type CourseStatus = z.infer<typeof courseStatusSchema>;

export const enrollmentTypeSchema = z.enum(["free", "paid"]);
export type EnrollmentType = z.infer<typeof enrollmentTypeSchema>;

const createCourseObjectSchema = z.object({
  subjectId: z.string().trim().min(1),
  stageId: z.string().trim().min(1),
  title: localizedRequiredTextSchema,
  description: localizedOptionalTextSchema.optional(),
  thumbnailUrl: z.string().trim().url().optional(),
  enrollmentType: enrollmentTypeSchema.default("paid"),
  price: z.coerce.number().min(0).optional(),
  currency: z.string().trim().length(3).default("EGP"),
});

export const createCourseSchema = createCourseObjectSchema.refine(
  (data) => data.enrollmentType === "free" || data.price !== undefined,
  {
    message: "errors.validation",
    path: ["price"],
  },
);
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseObjectSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "errors.validation",
});
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const updateCourseStatusSchema = z.object({
  status: courseStatusSchema,
});
export type UpdateCourseStatusInput = z.infer<typeof updateCourseStatusSchema>;
