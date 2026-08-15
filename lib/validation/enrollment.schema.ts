import { z } from "zod";

/** See `docs/database/collections.md` — `enrollments/{enrollmentId}`. */
export const enrollmentStatusSchema = z.enum(["active", "completed", "cancelled"]);
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>;

/**
 * `PATCH` body for marking a lesson complete (TASK-1102). Progress is the
 * only client-writable field on an enrollment — `status` is always
 * server-derived (per `features/enrollment.md`'s authorization notes).
 */
export const markLessonCompleteSchema = z.object({
  lessonId: z.string().min(1),
});
export type MarkLessonCompleteInput = z.infer<typeof markLessonCompleteSchema>;
