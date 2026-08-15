import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { courseService } from "@/lib/server/services/courseService";
import { signCloudinaryUpload, type CloudinarySignature } from "@/lib/server/cloudinary";
import type { SignUploadInput } from "@/lib/validation/upload.schema";

/**
 * Resolves and authorizes the Cloudinary folder for a signing request,
 * then produces the signature. This is the sole authorization choke
 * point for uploads (docs/cloudinary/README.md) — the client never
 * supplies the folder path directly, so it can't upload into another
 * teacher's namespace or an arbitrary Cloudinary folder.
 */
export const uploadService = {
  async signUpload(session: Session, input: SignUploadInput): Promise<CloudinarySignature> {
    assertRole(session, "teacher");

    const folder = await resolveFolder(session, input);
    const timestamp = Math.floor(Date.now() / 1000);
    return signCloudinaryUpload({ folder, timestamp });
  },
};

async function resolveFolder(session: Session, input: SignUploadInput): Promise<string> {
  // Only one target exists today; a switch keeps this ready to extend
  // (lesson video/files, avatar, ...) in later phases without reshaping
  // the function.
  switch (input.target) {
    case "course-thumbnail": {
      if (input.courseId) {
        // Editing an existing course — ownership check via the same
        // path the course API routes use.
        await courseService.getCourse(session, input.courseId);
        return `teachers/${session.uid}/courses/${input.courseId}/thumbnail`;
      }
      // Creating a new course: it doesn't exist yet, so upload into a
      // per-teacher staging folder. The returned URL is simply stored
      // on the course once created; nothing here depends on the final
      // courseId.
      return `teachers/${session.uid}/courses/_pending/thumbnail`;
    }
  }
}
