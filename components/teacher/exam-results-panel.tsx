"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Badge, DropdownMenu, EmptyState, Table } from "@/components/ui";
import type { ExamReportData, ExamReportRow } from "@/lib/server/services/examReportService";

interface ExamResultsPanelProps {
  examId: string;
  initialReport: ExamReportData;
}

/**
 * TASK-2804 — teacher-facing results table + export dropdown for one
 * exam, rendered on the quiz/exam detail page (`teacher/quizzes/[quizId]`)
 * alongside `QuizGrading`. Takes the server-assembled `ExamReportData`
 * (TASK-2801's `examReportService.getReportData` — same score-descending
 * rows and summary stats the exported PDF/Excel use) as a prop instead of
 * re-deriving names/stats client-side, so the on-screen table can never
 * disagree with what a teacher downloads. The export itself hits
 * `GET /api/exams/{examId}/export` purely for the file bytes.
 */
export function ExamResultsPanel({ examId, initialReport }: ExamResultsPanelProps) {
  const t = useTranslations("teacherDashboard.quizzes.resultsPanel");
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const { rows, summary } = initialReport;

  async function exportAs(format: "pdf" | "xlsx") {
    setError(null);
    setExporting(true);
    try {
      const res = await fetch(`/api/exams/${examId}/export?format=${format}`);
      if (!res.ok) {
        setError(t("errors.export"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const a = document.createElement("a");
      a.href = url;
      a.download = match?.[1] ?? `results.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("errors.export"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
          <p className="mt-1 text-xs text-foreground/60">{t("subtitle")}</p>
        </div>
        <DropdownMenu
          trigger={
            <span className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted">
              {exporting ? "…" : t("export")}
            </span>
          }
          items={[
            { label: t("exportPdf"), onSelect: () => exportAs("pdf"), disabled: exporting || rows.length === 0 },
            { label: t("exportXlsx"), onSelect: () => exportAs("xlsx"), disabled: exporting || rows.length === 0 },
          ]}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {rows.length > 0 && (
        <p className="text-xs text-foreground/70">
          {t("summary.attempts", { count: summary.attemptCount })} ·{" "}
          {t("summary.average", { value: summary.average })} · {t("summary.highest", { value: summary.highest })} ·{" "}
          {t("summary.lowest", { value: summary.lowest })} · {t("summary.passRate", { value: summary.passRate })}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <Table
          columns={[
            { key: "student", header: t("columns.student"), render: (row: ExamReportRow) => row.studentName },
            { key: "score", header: t("columns.score"), numeric: true, render: (row: ExamReportRow) => row.score },
            {
              key: "status",
              header: t("columns.status"),
              render: (row: ExamReportRow) => (
                <Badge variant={row.status === "graded" ? "success" : "warning"}>{row.status}</Badge>
              ),
            },
            {
              key: "submittedAt",
              header: t("columns.submittedAt"),
              render: (row: ExamReportRow) => new Date(row.submittedAt).toLocaleDateString(),
            },
          ]}
          rows={rows}
          rowKey={(row) => `${row.studentName}-${row.submittedAt}`}
        />
      )}
    </section>
  );
}
