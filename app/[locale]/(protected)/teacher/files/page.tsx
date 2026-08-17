import { getLocale, getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { fileService } from "@/lib/server/services/fileService";
import { courseRepository, type LocalizedText } from "@/lib/server/repositories/courseRepository";
import { lessonRepository } from "@/lib/server/repositories/lessonRepository";
import { TeacherFilesManager, type TeacherFileRow } from "@/components/teacher/teacher-files-manager";

function localizedTitle(title: LocalizedText, locale: string): string {
  return (locale === "ar" ? title.ar : title.en) || title.en || title.ar;
}

/**
 * TASK-1304 — replaces the TASK-701 "coming soon" nav placeholder with
 * a real cross-course files view. Files stay per-lesson at the data
 * layer (a file is only ever created attached to a lesson or a bare
 * course, per `docs/database/collections.md`) — this page is purely a
 * read/delete surface over `fileService.listFiles`'s new "no
 * courseId/lessonId" branch, which lists every file the signed-in
 * teacher owns. See `docs/tasks/phase-13-file-management.md`'s TASK-1304
 * note and `docs/features/files.md` for the reasoning.
 */
export default async function TeacherFilesPage() {
  const t = await getTranslations("teacherDashboard.files");
  const locale = await getLocale();
  const session = await requireSession();
  assertRole(session, "teacher");

  const files = await fileService.listFiles(session, {});

  const courseIds = files.map((file) => file.courseId).filter((id): id is string => !!id);
  const lessonIds = files.map((file) => file.lessonId).filter((id): id is string => !!id);

  const [courses, lessons] = await Promise.all([
    courseRepository.findByIds(courseIds),
    lessonRepository.findByIds(lessonIds),
  ]);

  const rows: TeacherFileRow[] = files.map((file) => {
    const course = file.courseId ? courses.get(file.courseId) : undefined;
    const lesson = file.lessonId ? lessons.get(file.lessonId) : undefined;
    return {
      ...file,
      courseTitle: course ? localizedTitle(course.title, locale) : null,
      lessonTitle: lesson ? localizedTitle(lesson.title, locale) : null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-foreground/60">{t("subtitle")}</p>
      </div>
      <TeacherFilesManager initialFiles={rows} />
    </div>
  );
}
