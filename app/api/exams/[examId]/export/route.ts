import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError, ValidationError } from "@/lib/errors";
import { examReportService } from "@/lib/server/services/examReportService";

interface RouteContext {
  params: Promise<{ examId: string }>;
}

/**
 * TASK-2801 — `GET /api/exams/{examId}/export?format=pdf|xlsx`. Teacher/
 * Admin-only, ownership-checked inside `examReportService.getReportData`
 * (same `assertTeacherOwnsResource` pattern as every other exam-scoped
 * route). Returns the rendered file directly as the response body with a
 * `Content-Disposition: attachment` header rather than a JSON envelope —
 * this route's whole job is a file download, so `handleApiError` still
 * covers the thrown-error path (404/403/etc. as JSON), but the success
 * path is binary, unlike the rest of `app/api/*`.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { examId } = await params;
    const session = await requireSession();
    const format = new URL(req.url).searchParams.get("format");
    if (format !== "pdf" && format !== "xlsx") {
      throw new ValidationError();
    }

    const data = await examReportService.getReportData(session, examId);
    const filenameSafeTitle = data.examTitle.replace(/[^a-zA-Z0-9-_]+/g, "-").toLowerCase() || "exam";

    if (format === "pdf") {
      const buffer = await examReportService.renderPdf(data);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filenameSafeTitle}-results.pdf"`,
        },
      });
    }

    const buffer = await examReportService.renderXlsx(data);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameSafeTitle}-results.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
