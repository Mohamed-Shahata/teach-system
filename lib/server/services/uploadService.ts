import "server-only";
import { assertRole, assertTeacherOwnsResource } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { courseService } from "@/lib/server/services/courseService";
import { lessonRepository } from "@/lib/server/repositories/lessonRepository";
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
    // `avatar` is the one self-service target open to every role
    // (admin/teacher/student each get a profile picture); the
    // course/lesson targets stay teacher-only, checked per-case below.
    if (input.target !== "avatar") {
      assertRole(session, "teacher");
    }

    const folder = await resolveFolder(session, input);
    const timestamp = Math.floor(Date.now() / 1000);
    return signCloudinaryUpload({ folder, timestamp });
  },
};

async function resolveFolder(session: Session, input: SignUploadInput): Promise<string> {
  // A switch keeps this ready to extend without reshaping the function.
  switch (input.target) {
    case "avatar": {
      // Own-uid folder, keyed by role so cleanup/inspection mirrors the
      // rest of docs/cloudinary/README.md's `{role}s/{uid}/...` layout.
      return `${session.role}s/${session.uid}/avatar`;
    }
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
    case "lesson-file": {
      if (!input.lessonId) {
        throw new ValidationError();
      }
      // The lesson must already exist (a file is always attached to an
      // existing lesson) — its own `courseId` is used to build the
      // folder rather than trusting a client-supplied one.
      const lesson = await lessonRepository.findById(input.lessonId);
      if (!lesson) {
        throw new NotFoundError();
      }
      assertTeacherOwnsResource(session, lesson);
      return `teachers/${session.uid}/courses/${lesson.courseId}/lessons/${lesson.id}/files`;
    }
    default: {
      const _exhaustive: never = input.target;
      throw new ValidationError();
    }
  }
}
