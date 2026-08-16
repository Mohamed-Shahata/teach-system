"use client";

import * as React from "react";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { EmptyState, Table } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { Column } from "@/components/ui/table";
import type { StudentSummary } from "@/lib/server/services/studentService";

interface StudentListProps {
  students: StudentSummary[];
  /** Locale-prefixed path the row link/detail action point into. Defaults to the teacher's own students list (TASK-1002); TASK-2403's Admin drill-down passes `/admin/teachers/{teacherId}/students` instead. */
  basePath?: string;
}

/**
 * TASK-1002 — read-only list of the teacher's students, derived from
 * their enrollments (`studentService.listStudents`, TASK-1001). Each row
 * links to `/teacher/students/[studentId]` for the detail view (enrolled
 * courses + progress). Create-a-student stays in `StudentManager`
 * (TASK-1000) on the same page, unchanged.
 *
 * TASK-2403 reuses this component read-only for the Admin's per-teacher
 * drill-down (`basePath` swaps the link target; there's no create form
 * in that context).
 */
export function StudentList({ students, basePath }: StudentListProps) {
  const t = useTranslations("teacherDashboard.students");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const format = useFormatter();
  const base = basePath ?? "/teacher/students";

  const columns: Column<StudentSummary>[] = [
    {
      key: "displayName",
      header: t("list.columns.name"),
      render: (student) => (
        <Link
          href={`/${locale}${base}/${student.uid}`}
          className="font-medium text-primary hover:underline"
        >
          {student.displayName}
        </Link>
      ),
    },
    { key: "email", header: t("list.columns.email") },
    { key: "stageId", header: t("list.columns.stage"), render: (student) => student.stageId ?? "—" },
    {
      key: "courseCount",
      header: t("list.columns.courses"),
      numeric: true,
      render: (student) => format.number(student.courseCount),
    },
    {
      key: "averageProgress",
      header: t("list.columns.progress"),
      numeric: true,
      render: (student) => t("list.progressValue", { percent: student.averageProgress }),
    },
  ];

  if (students.length === 0) {
    return <EmptyState title={t("list.emptyTitle")} description={t("list.emptyDescription")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Table
        columns={columns}
        rows={students}
        rowKey={(student) => student.uid}
        emptyMessage={t("list.emptyTitle")}
        actionsLabel={tCommon("actions")}
        rowActions={(student) => (
          <Link
            href={`/${locale}${base}/${student.uid}`}
            className={cn(
              "inline-flex h-8 items-center justify-center rounded-full border border-border bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            {t("list.viewDetails")}
          </Link>
        )}
      />
    </div>
  );
}
