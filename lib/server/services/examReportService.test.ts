import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/session";

const quizFindById = vi.fn();
const listByQuiz = vi.fn();
const findByIds = vi.fn();

vi.mock("@/lib/server/repositories/quizRepository", () => ({
  quizRepository: { findById: quizFindById },
}));

vi.mock("@/lib/server/repositories/quizAttemptRepository", () => ({
  quizAttemptRepository: { listByQuiz },
}));

vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findByIds },
}));

const { examReportService } = await import("./examReportService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

const teacherSession: Session = { uid: "teacher-1", email: "t@x.com", role: "teacher" };
const otherTeacherSession: Session = { uid: "teacher-2", email: "t2@x.com", role: "teacher" };
const studentSession: Session = { uid: "student-1", email: "s@x.com", role: "student" };

const exam = {
  id: "exam-1",
  teacherId: "teacher-1",
  title: { en: "Midterm", ar: "امتحان منتصف الفصل" },
  status: "published",
  questionIds: ["q1"],
  stageId: "stage-1",
  scheduledAt: 1000,
  autoGrade: true,
  createdAt: 1,
  updatedAt: 1,
};

describe("examReportService.getReportData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non teacher/admin roles", async () => {
    await expect(examReportService.getReportData(studentSession, "exam-1")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError when the exam doesn't exist", async () => {
    quizFindById.mockResolvedValue(null);
    await expect(examReportService.getReportData(teacherSession, "exam-1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ForbiddenError when a different teacher owns the exam", async () => {
    quizFindById.mockResolvedValue(exam);
    await expect(examReportService.getReportData(otherTeacherSession, "exam-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("assembles rows sorted by score descending with computed summary stats", async () => {
    quizFindById.mockResolvedValue(exam);
    listByQuiz.mockResolvedValue([
      { id: "a1", studentId: "s1", quizId: "exam-1", teacherId: "teacher-1", answers: [], score: 60, status: "graded", submittedAt: 10 },
      { id: "a2", studentId: "s2", quizId: "exam-1", teacherId: "teacher-1", answers: [], score: 90, status: "graded", submittedAt: 20 },
      { id: "a3", studentId: "s3", quizId: "exam-1", teacherId: "teacher-1", answers: [], score: 0, status: "pending_review", submittedAt: 30 },
    ]);
    findByIds.mockResolvedValue(
      new Map([
        ["s1", { uid: "s1", displayName: "Ali" }],
        ["s2", { uid: "s2", displayName: "Sara" }],
      ]),
    );

    const data = await examReportService.getReportData(teacherSession, "exam-1");

    expect(data.examTitle).toBe("Midterm");
    expect(data.rows.map((r) => r.studentName)).toEqual(["Sara", "Ali", "—"]);
    expect(data.rows.map((r) => r.score)).toEqual([90, 60, 0]);
    // 60 and 90 clear the 50 pass mark, 0 doesn't — 2 of 3 attempts pass.
    expect(data.summary).toEqual({
      attemptCount: 3,
      average: 50,
      highest: 90,
      lowest: 0,
      passRate: 66.7,
    });
  });

  it("returns zeroed summary stats when there are no attempts", async () => {
    quizFindById.mockResolvedValue(exam);
    listByQuiz.mockResolvedValue([]);
    findByIds.mockResolvedValue(new Map());

    const data = await examReportService.getReportData(teacherSession, "exam-1");

    expect(data.rows).toEqual([]);
    expect(data.summary).toEqual({ attemptCount: 0, average: 0, highest: 0, lowest: 0, passRate: 0 });
  });
});

describe("examReportService.renderPdf / renderXlsx", () => {
  const sampleData = {
    examTitle: "Midterm",
    generatedAt: Date.now(),
    passMark: 50,
    rows: [{ studentName: "Ali", score: 90, status: "graded" as const, submittedAt: Date.now() }],
    summary: { attemptCount: 1, average: 90, highest: 90, lowest: 90, passRate: 100 },
  };

  it("renders a non-empty PDF buffer", async () => {
    const buffer = await examReportService.renderPdf(sampleData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF magic bytes
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders a non-empty xlsx buffer", async () => {
    const buffer = await examReportService.renderXlsx(sampleData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // xlsx files are zip archives — magic bytes "PK"
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });

  it("renders a PDF and xlsx even with zero rows", async () => {
    const empty = { ...sampleData, rows: [], summary: { attemptCount: 0, average: 0, highest: 0, lowest: 0, passRate: 0 } };
    const pdf = await examReportService.renderPdf(empty);
    const xlsx = await examReportService.renderXlsx(empty);
    expect(pdf.length).toBeGreaterThan(0);
    expect(xlsx.length).toBeGreaterThan(0);
  });
});
