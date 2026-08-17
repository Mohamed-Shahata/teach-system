import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getReportData = vi.fn();
const renderPdf = vi.fn();
const renderXlsx = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/examReportService", () => ({
  examReportService: { getReportData, renderPdf, renderXlsx },
}));

const { GET } = await import("./route");
const { NotFoundError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ examId: "exam-1" }) };
const reportData = {
  examTitle: "Midterm",
  generatedAt: 123,
  passMark: 50,
  rows: [],
  summary: { attemptCount: 0, average: 0, highest: 0, lowest: 0, passRate: 0 },
};

function makeRequest(format?: string) {
  const url = new URL("http://localhost/api/exams/exam-1/export");
  if (format) url.searchParams.set("format", format);
  return new Request(url);
}

describe("/api/exams/[examId]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
    getReportData.mockResolvedValue(reportData);
  });

  it("returns a PDF download for format=pdf", async () => {
    renderPdf.mockResolvedValue(Buffer.from("%PDF-fake"));

    const res = await GET(makeRequest("pdf"), context);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("midterm-results.pdf");
    expect(getReportData).toHaveBeenCalledWith(session, "exam-1");
  });

  it("returns an xlsx download for format=xlsx", async () => {
    renderXlsx.mockResolvedValue(Buffer.from("PK-fake"));

    const res = await GET(makeRequest("xlsx"), context);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(res.headers.get("Content-Disposition")).toContain("midterm-results.xlsx");
  });

  it("rejects a missing/invalid format before touching the service", async () => {
    const res = await GET(makeRequest("csv"), context);

    expect(res.status).toBe(400);
    expect(getReportData).not.toHaveBeenCalled();
  });

  it("propagates a service error (e.g. not found / not owned) as an error response", async () => {
    getReportData.mockRejectedValue(new NotFoundError());

    const res = await GET(makeRequest("pdf"), context);

    expect(res.status).toBe(404);
  });
});
