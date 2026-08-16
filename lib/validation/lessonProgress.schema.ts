import { z } from "zod";

/**
 * `PATCH` body for `/api/lessons/{lessonId}/progress` (TASK-2502). The
 * client video player reports its current playhead/duration; the
 * server derives `watchedSeconds` from it (see
 * `lessonProgressService.reportProgress`) rather than trusting a
 * client-computed cumulative figure directly.
 */
export const reportLessonProgressSchema = z.object({
  currentTimeSeconds: z.number().min(0),
  durationSeconds: z.number().min(0),
});
export type ReportLessonProgressInput = z.infer<typeof reportLessonProgressSchema>;
