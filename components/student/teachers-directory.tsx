"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LocalizedText } from "@/lib/server/repositories/subjectRepository";
import type { TeacherDirectoryEntry } from "@/lib/server/services/teacherDirectoryService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui";

/**
 * TASK-3203 — the tabbed "Teachers" directory: an "All" tab (every public
 * teacher) and a "My Teachers" tab (filtered to `subscribed === true`,
 * Phase 29). A plain client-side filter over one already-fetched list —
 * no second request — since the whole list (both tabs' data) comes back
 * from a single `teacherDirectoryService.listTeacherDirectory` call.
 */

export interface TeachersDirectoryStrings {
  tabAll: string;
  tabMine: string;
  emptyAllTitle: string;
  emptyAllDescription: string;
  emptyMineTitle: string;
  emptyMineDescription: string;
  viewCourses: string;
  coursesCount: (count: number) => string;
  subscribedBadge: string;
}

function localizedText(text: Partial<LocalizedText> | undefined, locale: string): string | undefined {
  if (!text) return undefined;
  return (locale === "ar" ? text.ar : text.en) || text.en || text.ar;
}

function TeacherCard({
  teacher,
  locale,
  strings,
}: {
  teacher: TeacherDirectoryEntry;
  locale: string;
  strings: TeachersDirectoryStrings;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="mb-0 flex-row items-center gap-3 space-y-0">
        {teacher.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={teacher.avatarUrl}
            alt={teacher.displayName}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {teacher.displayName.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="truncate">{teacher.displayName}</CardTitle>
            {teacher.subscribed && <Badge variant="success">{strings.subscribedBadge}</Badge>}
          </div>
          {teacher.subjectName && (
            <p className="truncate text-xs text-foreground/60">{localizedText(teacher.subjectName, locale)}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground/60">{strings.coursesCount(teacher.courseCount)}</span>
        <Link href={`/${locale}/student/teachers/${teacher.teacherId}`}>
          <Button type="button" variant="outline">
            {strings.viewCourses}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function TeacherGrid({
  teachers,
  locale,
  strings,
  emptyTitle,
  emptyDescription,
}: {
  teachers: TeacherDirectoryEntry[];
  locale: string;
  strings: TeachersDirectoryStrings;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (teachers.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {teachers.map((teacher) => (
        <TeacherCard key={teacher.teacherId} teacher={teacher} locale={locale} strings={strings} />
      ))}
    </div>
  );
}

export function TeachersDirectory({
  teachers,
  locale,
  strings,
}: {
  teachers: TeacherDirectoryEntry[];
  locale: string;
  strings: TeachersDirectoryStrings;
}) {
  const [tab, setTab] = useState<"all" | "mine">("all");
  const myTeachers = useMemo(() => teachers.filter((t) => t.subscribed), [teachers]);

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-1 border-b border-border">
        {(
          [
            { value: "all", label: strings.tabAll },
            { value: "mine", label: strings.tabMine },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={
              "border-b-2 px-3 py-2 text-sm font-medium -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
              (tab === item.value
                ? "border-primary text-primary"
                : "border-transparent text-foreground/60 hover:text-foreground")
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "all" ? (
        <TeacherGrid
          teachers={teachers}
          locale={locale}
          strings={strings}
          emptyTitle={strings.emptyAllTitle}
          emptyDescription={strings.emptyAllDescription}
        />
      ) : (
        <TeacherGrid
          teachers={myTeachers}
          locale={locale}
          strings={strings}
          emptyTitle={strings.emptyMineTitle}
          emptyDescription={strings.emptyMineDescription}
        />
      )}
    </div>
  );
}
