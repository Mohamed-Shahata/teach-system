import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getOverview = vi.fn();
const renderXlsx = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/analyticsExportService", () => ({
  analyticsExportService: { getOverview, renderXlsx },
}));

const { GET } = await import("./route");

const session = { uid: "admin-1", email: "admin@example.com", role: "admin" };
const overview = {
  totalStudents: 1,
  totalTeachers: 1,
  activeSubscriptions: 1,
  totalRevenue: 100,
  pendingInvoices: 0,
  granularity: "year",
  monthlyRevenue: [],
  subscriptionGrowth: [],
  teacherBreakdown: [],
  subjectBreakdown: [],
  stageBreakdown: [],
};

function makeRequest(granularity?: string) {
  const url = new URL("http://localhost/api/admin/analytics/export");
  if (granularity) url.searchParams.set("granularity", granularity);
  return new Request(url);
}

describe("/api/admin/analytics/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
    getOverview.mockResolvedValue(overview);
    renderXlsx.mockResolvedValue(Buffer.from("PK-fake"));
  });

  it("returns an xlsx download reflecting the resolved granularity", async () => {
    const res = await GET(makeRequest("month"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(res.headers.get("Content-Disposition")).toContain("analytics-year.xlsx");
    expect(getOverview).toHaveBeenCalledWith(session, "month");
  });

  it("passes granularity=undefined when omitted, letting the service default", async () => {
    await GET(makeRequest());
    expect(getOverview).toHaveBeenCalledWith(session, undefined);
  });

  it("rejects an invalid granularity", async () => {
    const res = await GET(makeRequest("decade"));
    expect(res.status).toBe(400);
  });
});
