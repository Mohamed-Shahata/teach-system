import { z } from "zod";

/**
 * `PUT` body for `/api/teachers/{teacherId}/reviews/me` (TASK-2702). A
 * student upserts their own single review for a teacher — there's no
 * `POST` (create) vs `PATCH` (edit) split since the operation is the
 * same either way (see `reviewService.upsertReview`'s doc comment).
 */
export const upsertReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});
export type UpsertReviewInput = z.infer<typeof upsertReviewSchema>;

/** `PATCH` body for `/api/admin/reviews/{reviewId}` (TASK-2704) — Admin moderation, hide/unhide only. */
export const setReviewHiddenSchema = z.object({
  hidden: z.boolean(),
});
export type SetReviewHiddenInput = z.infer<typeof setReviewHiddenSchema>;
