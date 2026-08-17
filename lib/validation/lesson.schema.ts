import { z } from "zod";
import { localizedOptionalTextSchema, localizedRequiredTextSchema } from "@/lib/validation/common.schema";

export const videoProviderSchema = z.enum(["cloudinary", "youtube", "external"]);
export type VideoProvider = z.infer<typeof videoProviderSchema>;

/**
 * Provider-agnostic video field (`docs/database/collections.md`
 * `lessons.video`) — same shape regardless of provider, per
 * `docs/cloudinary/README.md` "Video handling".
 */
export const lessonVideoSchema = z.object({
  provider: videoProviderSchema,
  url: z.string().trim().url(),
  publicId: z.string().trim().min(1).optional(),
});
export type LessonVideoInput = z.infer<typeof lessonVideoSchema>;

const createLessonObjectSchema = z.object({
  title: localizedRequiredTextSchema,
  description: localizedOptionalTextSchema.optional(),
  video: lessonVideoSchema.optional(),
  fileIds: z.array(z.string().trim().min(1)).optional(),
  /**
   * TASK-3105 — lets a non-enrolled student watch this specific lesson
   * to evaluate the teacher before paying. Teacher/Admin-settable only
   * (same authorization as every other lesson field, guarded at the
   * service layer, not here).
   */
  isFreePreview: z.boolean().optional(),
});

export const createLessonSchema = createLessonObjectSchema;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

export const updateLessonSchema = createLessonObjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "errors.validation" });
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;

/**
 * Reordering is a distinct operation from a field update (mirrors the
 * `{ status }` publish toggle on courses being separate from
 * `updateCourseSchema`) — it replaces `course.lessonOrder` and every
 * affected lesson's `order` in one call, driven by drag-and-drop in the
 * UI (TASK-903), rather than editing one lesson's `order` in isolation.
 */
export const reorderLessonsSchema = z.object({
  lessonIds: z.array(z.string().trim().min(1)).min(1),
});
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
