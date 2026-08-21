"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Input, Select, Table } from "@/components/ui";
import type { Column } from "@/components/ui/table";
import type { AdminCourseOverviewEntry } from "@/lib/server/services/adminCourseOverviewService";
import type { SubjectDoc } from "@/lib/server/repositories/subjectRepository";
import type { EducationStageDoc } from "@/lib/server/repositories/educationStageRepository";

interface CourseOverviewProps {
  initialCourses: AdminCourseOverviewEntry[];
  subjects: SubjectDoc[];
  stages: EducationStageDoc[];
}

const ALL = "__all__";

/**
 * TASK-2401 — Admin-facing, center-wide course list. Read-only (no
 * edit/delete — ownership stays with the teacher, per `architecture/
 * ownership-model.md`), so unlike `TeacherManager`/`StudentManager` this
 * has no dialogs or mutating actions: just search + subject/stage/status
 * filters over `adminCourseOverviewService.listCourses`'s already-joined
 * data, filtered client-side (the full center-wide course list is the
 * same small-dataset shape `TeacherManager` starts from before its own
 * search box triggers a refetch).
 */
export function CourseOverview({ initialCourses, subjects, stages }: CourseOverviewProps) {
  const t = useTranslations("adminDashboard.courseOverview");
  const locale = useLocale();

  const [search, setSearch] = React.useState("");
  const [teacherFilter, setTeacherFilter] = React.useState(ALL);
  const [subjectFilter, setSubjectFilter] = React.useState(ALL);
  const [stageFilter, setStageFilter] = React.useState(ALL);
  const [statusFilter, setStatusFilter] = React.useState(ALL);

  function localizedName(name?: { en: string; ar: string }): string {
    if (!name) return "—";
    return locale === "ar" ? name.ar || name.en : name.en || name.ar;
  }

  const teacherOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const course of initialCourses) seen.set(course.teacherId, course.teacherName);
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [initialCourses]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return initialCourses.filter((course) => {
      if (teacherFilter !== ALL && course.teacherId !== teacherFilter) return false;
      if (subjectFilter !== ALL && course.subjectId !== subjectFilter) return false;
      if (stageFilter !== ALL && course.stageId !== stageFilter) return false;
      if (statusFilter !== ALL && course.status !== statusFilter) return false;
      if (!query) return true;
      const title = localizedName(course.title).toLowerCase();
      return title.includes(query) || course.teacherName.toLowerCase().includes(query);
    });
  }, [initialCourses, search, teacherFilter, subjectFilter, stageFilter, statusFilter]);

  const columns: Column<AdminCourseOverviewEntry>[] = [
    { key: "title", header: t("columns.title"), render: (course) => localizedName(course.title) },
    { key: "teacher", header: t("columns.teacher"), render: (course) => course.teacherName },
    { key: "subject", header: t("columns.subject"), render: (course) => localizedName(course.subjectName) },
    { key: "stage", header: t("columns.stage"), render: (course) => localizedName(course.stageName) },
    {
      key: "status",
      header: t("columns.status"),
      render: (course) => (
        <Badge variant={course.status === "published" ? "success" : "neutral"}>
          {course.status === "published" ? t("statusPublished") : t("statusDraft")}
        </Badge>
      ),
    },
    { key: "enrollmentCount", header: t("columns.enrollments"), numeric: true, render: (course) => String(course.enrollmentCount) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
        <Select
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
          options={[{ value: ALL, label: t("filters.allTeachers") }, ...teacherOptions]}
          aria-label={t("filters.allTeachers")}
        />
        <Select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          options={[
            { value: ALL, label: t("filters.allSubjects") },
            ...subjects.map((subject) => ({ value: subject.id, label: localizedName(subject.name) })),
          ]}
          aria-label={t("filters.allSubjects")}
        />
        <Select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          options={[
            { value: ALL, label: t("filters.allStages") },
            ...stages.map((stage) => ({ value: stage.id, label: localizedName(stage.name) })),
          ]}
          aria-label={t("filters.allStages")}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: ALL, label: t("filters.allStatuses") },
            { value: "draft", label: t("statusDraft") },
            { value: "published", label: t("statusPublished") },
          ]}
          aria-label={t("filters.allStatuses")}
        />
      </div>

      <Table
        columns={columns}
        rows={filtered}
        rowKey={(course) => course.courseId}
        emptyMessage={t("empty")}
        rowActions={(course) => (
          <Link href={`/${locale}/admin/courses/${course.courseId}`} className="text-primary hover:underline">
            {t("view")}
          </Link>
        )}
        actionsLabel={t("columns.actions")}
      />
    </div>
  );
}
