"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { ReviewDoc } from "@/lib/server/repositories/reviewRepository";

interface TeacherReviewFormProps {
  teacherId: string;
  /** The caller's existing review, if any — prefills for editing. `undefined` while still loading. */
  initialReview: ReviewDoc | null;
}

const RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * TASK-2702 — "Leave a review" form on a teacher's student-facing page
 * (`student/teachers/[teacherId]`). Only ever rendered when the caller
 * is already known to be eligible (an active/past enrollment with this
 * teacher) — the page decides that (TASK-2301's directory already tells
 * a student which teachers are theirs); this component itself doesn't
 * re-check it client-side, since the real gate is server-side
 * (`reviewService.assertEligible`) regardless.
 */
export function TeacherReviewForm({ teacherId, initialReview }: TeacherReviewFormProps) {
  const t = useTranslations("studentTeachers.review");

  const [rating, setRating] = React.useState(initialReview?.rating ?? 0);
  const [comment, setComment] = React.useState(initialReview?.comment ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const isEditing = Boolean(initialReview);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1) {
      setError(t("errors.ratingRequired"));
      return;
    }
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/teachers/${teacherId}/reviews/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) throw new Error("upsert-review");
      setSuccess(true);
    } catch {
      setError(t("errors.submit"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? t("editTitle") : t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground text-start">{t("ratingLabel")}</span>
            <div className="flex gap-1" role="radiogroup" aria-label={t("ratingLabel")}>
              {RATINGS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={t("ratingValue", { value })}
                  onClick={() => setRating(value)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                    value <= rating
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-transparent text-foreground/60 hover:bg-surface-muted",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label={t("commentLabel")}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            rows={4}
          />

          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{t(isEditing ? "editSuccess" : "submitSuccess")}</Alert>}

          <Button type="submit" loading={saving} className="self-start">
            {isEditing ? t("saveButton") : t("submitButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
