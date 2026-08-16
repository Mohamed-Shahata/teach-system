import "server-only";
import { assertRole, assertStudentEnrolled } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { lessonProgressRepository } from "@/lib/server/repositories/lessonProgressRepository";
import { lessonRepository } from "@/lib/server/repositories/lessonRepository";
import { enrollmentService } from "@/lib/server/services/enrollmentService";
import type { ReportLessonProgressInput } from "@/lib/validation/lessonProgress.schema";

/**
 * Lesson watch-progress service — TASK-2502. A student-only, best-effort
 * reporting endpoint: the player calls this every ~10s or on
 * pause/unmount (see `components/student/lesson-player.tsx`), so this
 * stays cheap (one lesson read, one enrollment read, one doc write) and
 * never throws for a merely-stale report.
 */
export const lessonProgressService = {
  /**
   * `watchedSeconds` is the server's own running "furthest point
   * reached" for this lesson, derived as `max(existing, reported
   * currentTime)` rather than trusting a client-computed cumulative
   * total — a simple, hard-to-game approximation of watch time that's
   * enough to distinguish "watched 10 seconds" from "watched the whole
   * thing" (TASK-2503's use case), without needing to track played
   * segments. `lastPositionSeconds` always takes the latest report
   * (a rewind is a real position, not a regression to guard against).
   */
  async reportProgress(session: Session, lessonId: string, input: ReportLessonProgressInput) {
    assertRole(session, "student");

    const lesson = await lessonRepository.findById(lessonId);
    if (!lesson) throw new NotFoundError();

    const enrollment = await enrollmentRepository.findByStudentAndCourse(session.uid, lesson.courseId);
    assertStudentEnrolled(session, enrollment);

    const existing = await lessonProgressRepository.findByStudentAndLesson(session.uid, lessonId);
    const watchedSeconds = Math.max(existing?.watchedSeconds ?? 0, input.currentTimeSeconds);

    const progress = await lessonProgressRepository.upsert({
      studentId: session.uid,
      lessonId,
      watchedSeconds,
      videoDurationSeconds: input.durationSeconds,
      lastPositionSeconds: input.currentTimeSeconds,
      updatedAt: Date.now(),
    });

    // TASK-2503 — rolls this report into enrollment.progress.percent
    // right away, rather than leaving it stale until the student next
    // marks a lesson complete.
    await enrollmentService.recalculateWatchProgress(session.uid, lesson.courseId);

    return progress;
  },
};
