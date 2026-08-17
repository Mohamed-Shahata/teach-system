import "server-only";
import { assertRole, assertTeacherOwnsResource } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { destroyCloudinaryUpload, resourceTypeFromMimeType } from "@/lib/server/cloudinary";
import { fileRepository, type FileDoc } from "@/lib/server/repositories/fileRepository";
import { lessonRepository, type LessonDoc } from "@/lib/server/repositories/lessonRepository";
import { courseService } from "@/lib/server/services/courseService";
import type { CreateFileInput, ListFilesQuery } from "@/lib/validation/file.schema";

/**
 * Persists file metadata after a client-side signed Cloudinary upload
 * and handles the Cloudinary+Firestore cascade on delete — TASK-1302,
 * see docs/cloudinary/README.md (sequence diagram) and
 * docs/features/files.md. The signing step (`uploadService`,
 * TASK-1301) is the sole authorization choke point for *where* a
 * teacher may upload; this service is the choke point for persisting
 * and later deleting the resulting metadata.
 */
export const fileService = {
  async listFiles(session: Session, query: ListFilesQuery): Promise<FileDoc[]> {
    assertRole(session, "teacher");

    if (query.lessonId) {
      const lesson = await requireOwnedLesson(session, query.lessonId);
      return fileRepository.listByLesson(lesson.id);
    }

    if (query.courseId) {
      await courseService.getCourse(session, query.courseId);
      return fileRepository.listByCourse(query.courseId);
    }

    // Neither given: every file this teacher owns, across every
    // course/lesson (TASK-1304's standalone files page). Scoped to
    // `session.uid` — never a client-supplied teacherId — same rule
    // every other branch here already follows.
    return fileRepository.listByTeacher(session.uid);
  },

  async createFile(session: Session, input: CreateFileInput): Promise<FileDoc> {
    assertRole(session, "teacher");

    let lesson: LessonDoc | undefined;
    let courseId = input.courseId;
    let teacherId = session.uid;

    if (input.lessonId) {
      // A file attached to a lesson always takes its `courseId` and
      // `teacherId` from the lesson itself — never from the client —
      // per the same "never trust client-supplied owner data" rule as
      // `uploadService`'s `lesson-file` target.
      lesson = await requireOwnedLesson(session, input.lessonId);
      courseId = lesson.courseId;
      teacherId = lesson.teacherId;
    } else if (input.courseId) {
      await courseService.getCourse(session, input.courseId);
    }

    const file = await fileRepository.create({
      teacherId,
      ...(courseId ? { courseId } : {}),
      ...(input.lessonId ? { lessonId: input.lessonId } : {}),
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize,
      url: input.url,
      publicId: input.publicId,
      createdAt: Date.now(),
    });

    if (lesson) {
      await lessonRepository.update(session, lesson.id, {
        fileIds: [...lesson.fileIds, file.id],
        updatedAt: Date.now(),
      });
    }

    return file;
  },

  /**
   * Cascades: Cloudinary asset is destroyed before the Firestore
   * document is removed (docs/security/error-handling.md "Cloudinary/
   * Firestore compound operations"), so a Cloudinary failure never
   * leaves an orphaned Firestore reference — it just leaves the file
   * record in place, safe to retry the delete.
   */
  async deleteFile(session: Session, id: string): Promise<FileDoc> {
    assertRole(session, "teacher");
    const file = await fileRepository.findById(id);
    if (!file) {
      throw new NotFoundError();
    }
    assertTeacherOwnsResource(session, file);

    await destroyCloudinaryUpload(file.publicId, resourceTypeFromMimeType(file.fileType));
    await fileRepository.delete(session, id);

    if (file.lessonId) {
      const lesson = await lessonRepository.findById(file.lessonId);
      if (lesson) {
        await lessonRepository.update(session, lesson.id, {
          fileIds: lesson.fileIds.filter((fileId) => fileId !== id),
          updatedAt: Date.now(),
        });
      }
    }

    return file;
  },
};

async function requireOwnedLesson(session: Session, lessonId: string): Promise<LessonDoc> {
  const lesson = await lessonRepository.findById(lessonId);
  if (!lesson) {
    throw new NotFoundError();
  }
  assertTeacherOwnsResource(session, lesson);
  return lesson;
}
