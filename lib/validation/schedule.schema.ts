import { z } from "zod";

const localizedTextSchema = z.object({
  en: z.string().trim().max(120).optional(),
  ar: z.string().trim().max(120).optional(),
});

const scheduleBaseSchema = z.object({
  subjectId: z.string().trim().min(1),
  stageId: z.string().trim().min(1),
  courseId: z.string().trim().min(1).optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.coerce.number().int().min(15).max(360),
  label: localizedTextSchema.optional(),
});

export const createScheduleSlotSchema = scheduleBaseSchema;
export type CreateScheduleSlotInput = z.infer<typeof createScheduleSlotSchema>;

const updateScheduleSlotObjectSchema = scheduleBaseSchema.partial();

export const updateScheduleSlotSchema = updateScheduleSlotObjectSchema.refine((data) => Object.keys(data).length > 0, {
  message: "errors.validation",
});
export type UpdateScheduleSlotInput = z.infer<typeof updateScheduleSlotSchema>;

export const deleteScheduleSlotSchema = z.object({
  id: z.string().trim().min(1),
});

export const updateScheduleSlotWithIdSchema = updateScheduleSlotObjectSchema
  .extend({
    id: z.string().trim().min(1),
  })
  .refine((data) => Object.keys(data).some((key) => key !== "id"), {
    message: "errors.validation",
  });
export type UpdateScheduleSlotWithIdInput = z.infer<typeof updateScheduleSlotWithIdSchema>;
