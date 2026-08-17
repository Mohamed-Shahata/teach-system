import "server-only";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { assertRole, assertTeacherOwnsResource } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { quizAttemptRepository, type QuizAttemptDoc } from "@/lib/server/repositories/quizAttemptRepository";
import { quizRepository, type QuizDoc } from "@/lib/server/repositories/quizRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";

/**
 * Exam results export — TASK-2801/2802/2803. Reuses `quizAttemptRepository`
 * (Phase 12) and `quizRepository`'s `stageId`-scoped standalone exams
 * (Phase 21) rather than introducing a new collection — an "exam" here is
 * just a `QuizDoc`, same as everywhere else in the codebase. This service
 * owns two responsibilities: (1) assembling the report data (ownership
 * check + attempt/name joins + summary stats) and (2) rendering that data
 * as a PDF or Excel buffer. Both formats consume the same `ExamReportData`
 * so the two renderers can never drift on numbers.
 */

const PASS_MARK = 50;

export interface ExamReportRow {
  studentName: string;
  score: number;
  status: QuizAttemptDoc["status"];
  submittedAt: number;
}

export interface ExamReportData {
  examTitle: string;
  generatedAt: number;
  passMark: number;
  rows: ExamReportRow[];
  summary: {
    attemptCount: number;
    average: number;
    highest: number;
    lowest: number;
    passRate: number;
  };
}

function computeSummary(rows: ExamReportRow[], passMark: number): ExamReportData["summary"] {
  if (rows.length === 0) {
    return { attemptCount: 0, average: 0, highest: 0, lowest: 0, passRate: 0 };
  }
  const scores = rows.map((row) => row.score);
  const passCount = scores.filter((score) => score >= passMark).length;
  return {
    attemptCount: rows.length,
    average: Math.round((scores.reduce((sum, score) => sum + score, 0) / rows.length) * 10) / 10,
    highest: Math.max(...scores),
    lowest: Math.min(...scores),
    passRate: Math.round((passCount / rows.length) * 1000) / 10,
  };
}

async function loadOwnedExam(session: Session, examId: string): Promise<QuizDoc> {
  const exam = await quizRepository.findById(examId);
  if (!exam) throw new NotFoundError();
  assertTeacherOwnsResource(session, exam);
  return exam;
}

export const examReportService = {
  /**
   * TASK-2801 — teacher/Admin-only, gated on quiz ownership the same way
   * `quizAttemptService.listAttemptsForQuiz` is. Sorted by score
   * descending (per the task's acceptance criteria), scores from
   * `pending_review` attempts (manually-graded, TASK-2102) are still
   * included at their placeholder `0` — a teacher exporting mid-grading
   * sees exactly what the on-screen results panel would show them.
   */
  async getReportData(session: Session, examId: string): Promise<ExamReportData> {
    assertRole(session, "teacher", "admin");
    const exam = await loadOwnedExam(session, examId);

    const attempts = await quizAttemptRepository.listByQuiz(examId);
    const students = await userRepository.findByIds(attempts.map((attempt) => attempt.studentId));

    const rows: ExamReportRow[] = attempts
      .map((attempt) => ({
        studentName: students.get(attempt.studentId)?.displayName ?? "—",
        score: attempt.score,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
      }))
      .sort((a, b) => b.score - a.score);

    return {
      examTitle: exam.title.en,
      generatedAt: Date.now(),
      passMark: PASS_MARK,
      rows,
      summary: computeSummary(rows, PASS_MARK),
    };
  },

  /** TASK-2802 — server-rendered PDF: title, generated-at date, per-student score table, summary stats. */
  async renderPdf(data: ExamReportData): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(18).text(data.examTitle, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#555").text(new Date(data.generatedAt).toISOString(), { align: "center" });
    doc.fillColor("#000").moveDown(1);

    doc.fontSize(12).text(
      `Attempts: ${data.summary.attemptCount}   Average: ${data.summary.average}   ` +
        `Highest: ${data.summary.highest}   Lowest: ${data.summary.lowest}   ` +
        `Pass rate (>= ${data.passMark}): ${data.summary.passRate}%`,
    );
    doc.moveDown(1);

    const colX = { name: 50, score: 300, status: 380, date: 470 };
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("Student", colX.name, doc.y, { continued: false });
    doc.text("Score", colX.score, doc.y - doc.currentLineHeight());
    doc.text("Status", colX.status, doc.y - doc.currentLineHeight());
    doc.text("Submitted", colX.date, doc.y - doc.currentLineHeight());
    doc.moveDown(0.5);
    doc.font("Helvetica");

    for (const row of data.rows) {
      const y = doc.y;
      if (y > 720) doc.addPage();
      const rowY = doc.y;
      doc.text(row.studentName, colX.name, rowY, { width: colX.score - colX.name - 10 });
      doc.text(String(row.score), colX.score, rowY);
      doc.text(row.status, colX.status, rowY);
      doc.text(new Date(row.submittedAt).toLocaleDateString(), colX.date, rowY);
      doc.moveDown(0.4);
    }

    if (data.rows.length === 0) {
      doc.text("No attempts yet.");
    }

    doc.end();
    return done;
  },

  /** TASK-2803 — same data as `renderPdf`, one row per student, for teachers importing into their own gradebook. */
  async renderXlsx(data: ExamReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Results");

    sheet.addRow([data.examTitle]);
    sheet.addRow([`Generated: ${new Date(data.generatedAt).toISOString()}`]);
    sheet.addRow([]);
    sheet.addRow([
      "Attempts",
      "Average",
      "Highest",
      "Lowest",
      `Pass rate (>= ${data.passMark})`,
    ]);
    sheet.addRow([
      data.summary.attemptCount,
      data.summary.average,
      data.summary.highest,
      data.summary.lowest,
      `${data.summary.passRate}%`,
    ]);
    sheet.addRow([]);

    const headerRow = sheet.addRow(["Student", "Score", "Status", "Submitted At"]);
    headerRow.font = { bold: true };

    for (const row of data.rows) {
      sheet.addRow([row.studentName, row.score, row.status, new Date(row.submittedAt).toISOString()]);
    }

    sheet.columns.forEach((column) => {
      column.width = 22;
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  },
};
