"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Alert, Button } from "@/components/ui";

export interface MarkLessonCompleteButtonProps {
  enrollmentId: string;
  lessonId: string;
  alreadyCompleted: boolean;
}

/**
 * TASK-3202 — thin client wrapper over the existing
 * `PATCH /api/enrollments/{enrollmentId}` (TASK-1102's
 * `markLessonComplete`, unchanged). Only rendered when the viewer has
 * a real enrollment (see `student/courses/[courseId]/lessons/[lessonId]/page.tsx`) —
 * a free-preview visitor with no enrollment has nothing to mark complete.
 */
export function MarkLessonCompleteButton({ enrollmentId, lessonId, alreadyCompleted }: MarkLessonCompleteButtonProps) {
  const t = useTranslations("studentCourses.lesson");
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState(alreadyCompleted);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      if (!res.ok) throw new Error("request failed");
      setCompleted(true);
      router.refresh();
    } catch {
      setError(t("errors.markComplete"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert variant="error">{error}</Alert>}
      <Button type="button" variant={completed ? "outline" : "primary"} loading={loading} disabled={completed} onClick={handleClick}>
        {completed ? t("completed") : t("markComplete")}
      </Button>
    </div>
  );
}
