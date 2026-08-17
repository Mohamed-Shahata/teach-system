import { z } from "zod";

/**
 * Metadata persisted to `files/{fileId}` after a client-side signed
 * upload to Cloudinary completes — see docs/cloudinary/README.md
 * (sequence diagram) and docs/database/collections.md `files/{fileId}`.
 * The client never chooses `teacherId`; it's always resolved server-side
 * from the session (and, when `lessonId` is given, from the lesson's own
 * owner) — see `fileService.createFile`.
 */
export const createFileSchema = z.object({
  // A file may be attached to a lesson (courseId is then derived from
  // the lesson itself by fileService, never trusted from the client), or
  // simply scoped to a bare courseId with no lesson yet.
  courseId: z.string().trim().min(1).optional(),
  lessonId: z.string().trim().min(1).optional(),
  fileName: z.string().trim().min(1),
  fileType: z.string().trim().min(1),
  fileSize: z.number().int().positive(),
  url: z.string().trim().url(),
  publicId: z.string().trim().min(1),
});
export type CreateFileInput = z.infer<typeof createFileSchema>;

/**
 * Both are optional: courseId/lessonId narrow the list (per-lesson
 * uploader, per-course future use); omitting both means "every file
 * this teacher has ever uploaded" (TASK-1304's standalone files page),
 * scoped server-side to the session's own teacherId, never a query
 * param — see `fileService.listFiles`.
 */
export const listFilesQuerySchema = z.object({
  courseId: z.string().trim().min(1).optional(),
  lessonId: z.string().trim().min(1).optional(),
});
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;
