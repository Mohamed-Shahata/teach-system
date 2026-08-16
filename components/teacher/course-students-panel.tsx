"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Button, Dialog, EmptyState, Table } from "@/components/ui";
import type { Column } from "@/components/ui/table";
import type { CourseStudentProgress } from "@/lib/server/services/studentService";

interface CourseStudentsPanelProps {
  courseId: string;
  initialStudents: CourseStudentProgress[];
}

/**
 * TASK-2504 — mounted on the teacher course detail page, alongside
 * `LessonManager`/`QuizManager`. Shows each enrolled student's overall
 * course progress plus a per-lesson watch-percentage breakdown (in a
 * `Dialog`, since the lesson count varies per course and doesn't fit a
 * flat table column set) — so a teacher can tell a student who watched
 * every video from one who only clicked "mark complete".
 *
 * Backed by `GET /api/courses/[courseId]/students`
 * (`studentService.getCourseStudentsProgress`, TASK-2503's
 * `lessonProgress`-derived watch percentages). `initialStudents` is
 * server-fetched on first render, same as `initialLessons`/
 * `initialQuizzes` on the sibling managers; a manual refresh re-fetches
 * client-side in case watch data changed since the page loaded.
 */
export function CourseStudentsPanel({ courseId, initialStudents }: CourseStudentsPanelProps) {
  const t = useTranslations("teacherDashboard.courseStudentsPanel");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [students, setStudents] = React.useState(initialStudents);
  const [detailTarget, setDetailTarget] = React.useState<CourseStudentProgress | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/students`);
      if (!res.ok) throw new Error("refresh");
      const body = (await res.json()) as { students: CourseStudentProgress[] };
      setStudents(body.students);
    } catch {
      setError(t("errors.refresh"));
    } finally {
      setRefreshing(false);
    }
  }

  const columns: Column<CourseStudentProgress>[] = [
    { key: "displayName", header: t("columns.name") },
    { key: "email", header: t("columns.email") },
    {
      key: "overallPercent",
      header: t("columns.overallProgress"),
      numeric: true,
      render: (student) => t("progressValue", { percent: student.overallPercent }),
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          {refreshing ? tCommon("loading") : t("refresh")}
        </Button>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {students.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <Table
          columns={columns}
          rows={students}
          rowKey={(student) => student.studentId}
          emptyMessage={t("emptyTitle")}
          actionsLabel={tCommon("actions")}
          rowActions={(student) => (
            <Button type="button" variant="outline" size="sm" onClick={() => setDetailTarget(student)}>
              {t("viewBreakdown")}
            </Button>
          )}
        />
      )}

      <Dialog
        open={detailTarget !== null}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        title={detailTarget?.displayName ?? ""}
        description={t("dialogDescription")}
        size="lg"
      >
        {detailTarget && (
          <ul className="flex flex-col gap-2">
            {detailTarget.lessons.length === 0 && (
              <li className="text-sm text-muted-foreground">{t("noLessons")}</li>
            )}
            {detailTarget.lessons.map((lesson) => (
              <li
                key={lesson.lessonId}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <span className="text-sm text-foreground">
                  {lesson.lessonTitle[locale as "en" | "ar"] || lesson.lessonTitle.en}
                </span>
                <span className="flex items-center gap-2">
                  {lesson.completed && (
                    <Badge variant="success">{t("completedBadge")}</Badge>
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {t("progressValue", { percent: lesson.watchPercent })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
