"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, Table } from "@/components/ui";
import type { Column } from "@/components/ui/table";
import type { ReviewDoc } from "@/lib/server/repositories/reviewRepository";

interface ReviewsPanelProps {
  initialReviews: ReviewDoc[];
}

/**
 * TASK-2704 — Admin moderation view for one teacher's reviews. Shows
 * every review (hidden or not, per `reviewService.listForModeration`)
 * with a hide/unhide toggle. Never edits `rating`/`comment` — the
 * underlying document isn't deleted either (per this task's
 * description), only its `hidden` flag flips, which is what
 * `firestore.rules` and `reviewRepository.setHidden` both enforce.
 */
export function ReviewsPanel({ initialReviews }: ReviewsPanelProps) {
  const t = useTranslations("adminDashboard.reviews");
  const [reviews, setReviews] = React.useState(initialReviews);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onToggleHidden(review: ReviewDoc) {
    setError(null);
    setPendingId(review.id);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !review.hidden }),
      });
      if (!res.ok) throw new Error("toggle-hidden");
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, hidden: !r.hidden } : r)));
    } catch {
      setError(t("errors.toggle"));
    } finally {
      setPendingId(null);
    }
  }

  const columns: Column<ReviewDoc>[] = [
    { key: "rating", header: t("columns.rating"), render: (row) => `${row.rating}/5` },
    { key: "comment", header: t("columns.comment"), render: (row) => row.comment ?? "—" },
    { key: "status", header: t("columns.status"), render: (row) => (row.hidden ? t("hidden") : t("visible")) },
  ];

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert variant="error">{error}</Alert>}
      <Table
        columns={columns}
        rows={reviews}
        rowKey={(row) => row.id}
        emptyMessage={t("empty")}
        actionsLabel={t("columns.actions")}
        rowActions={(row) => (
          <Button
            type="button"
            size="sm"
            variant={row.hidden ? "outline" : "destructive"}
            loading={pendingId === row.id}
            onClick={() => onToggleHidden(row)}
          >
            {row.hidden ? t("unhide") : t("hide")}
          </Button>
        )}
      />
    </div>
  );
}
