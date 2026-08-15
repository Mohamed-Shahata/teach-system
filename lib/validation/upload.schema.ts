import { z } from "zod";

/**
 * `target` enumerates the known upload destinations so the signing
 * service can build (and authorize) the Cloudinary folder path itself —
 * the client never supplies a raw folder string. See
 * docs/cloudinary/README.md "Folder structure".
 */
export const uploadTargetSchema = z.enum(["course-thumbnail"]);
export type UploadTarget = z.infer<typeof uploadTargetSchema>;

export const signUploadSchema = z.object({
  target: uploadTargetSchema,
  // Present when uploading for an existing course (edit flow) so
  // ownership can be verified; omitted for a not-yet-created course
  // (create flow), which uploads into a per-teacher staging folder.
  courseId: z.string().trim().min(1).optional(),
});
export type SignUploadInput = z.infer<typeof signUploadSchema>;
