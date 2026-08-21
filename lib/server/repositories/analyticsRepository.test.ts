import { beforeEach, describe, expect, it, vi } from "vitest";

// Each Firestore collection gets its own chainable query mock so invoice
// and payment queries (fired together via Promise.all in the repository)
// can be scripted independently per test.
function makeQueryMock() {
  const where = vi.fn();
  const get = vi.fn();
  const query = { where, get };
  where.mockReturnValue(query);
  return query;
}

const invoicesQuery = makeQueryMock();
const paymentsQuery = makeQueryMock();
const subscriptionsQuery = makeQueryMock();
const enrollmentsQuery = makeQueryMock();
const coursesQuery = makeQueryMock();

const collection = vi.fn((name: string) => {
  if (name === "subscriptionInvoices") return invoicesQuery;
  if (name === "payments") return paymentsQuery;
  if (name === "subscriptions") return subscriptionsQuery;
  if (name === "enrollments") return enrollmentsQuery;
  if (name === "courses") return coursesQuery;
  throw new Error(`unexpected collection: ${name}`);
});

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { analyticsRepository, buildRange } = await import("./analyticsRepository");

function docsOf(rows: Array<Record<string, unknown>>) {
  return { docs: rows.map((data) => ({ data: () => data })) };
}

describe("buildRange (TASK-3304)", () => {
  const anchor = new Date(Date.UTC(2026, 7, 20)); // 20 Aug 2026

  it("month: one bucket per day of the anchor month, since/until spanning exactly that month", () => {
    const range = buildRange("month", anchor);
    expect(range.bucketKeys[0]).toBe("2026-08-01");
    expect(range.bucketKeys.at(-1)).toBe("2026-08-31");
    expect(range.bucketKeys).toHaveLength(31);
    expect(range.since).toBe(Date.UTC(2026, 7, 1));
    expect(range.until).toBe(Date.UTC(2026, 8, 1));
  });

  it("year: 12 monthly buckets spanning the anchor's calendar year", () => {
    const range = buildRange("year", anchor);
    expect(range.bucketKeys).toEqual([
      "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
      "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
    ]);
    expect(range.since).toBe(Date.UTC(2026, 0, 1));
    expect(range.until).toBe(Date.UTC(2027, 0, 1));
  });

  it("5year: 5 yearly buckets ending at the anchor's year", () => {
    const range = buildRange("5year", anchor);
    expect(range.bucketKeys).toEqual(["2022", "2023", "2024", "2025", "2026"]);
    expect(range.since).toBe(Date.UTC(2022, 0, 1));
    expect(range.until).toBe(Date.UTC(2027, 0, 1));
  });
});

describe("analyticsRepository.monthlyRevenue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("year granularity: combines confirmed subscription invoices (by period) and confirmed/succeeded payments (by createdAt) into the same monthly buckets", async () => {
    const anchor = new Date(Date.UTC(2026, 7, 20));
    const range = buildRange("year", anchor);
    const currentMonthStart = Date.UTC(2026, 7, 1);

    invoicesQuery.get.mockResolvedValue(docsOf([{ status: "confirmed", period: "2026-08", amount: 100 }]));
    paymentsQuery.get.mockResolvedValue(
      docsOf([
        { status: "succeeded", amount: 50, createdAt: currentMonthStart + 1000 },
        { status: "confirmed", amount: 25, createdAt: currentMonthStart + 2000 },
      ]),
    );

    const result = await analyticsRepository.monthlyRevenue(range);

    expect(result.find((p) => p.period === "2026-08")).toEqual({ period: "2026-08", value: 175 });
    expect(result.filter((p) => p.period !== "2026-08").every((p) => p.value === 0)).toBe(true);
    expect(paymentsQuery.where).toHaveBeenCalledWith("status", "in", ["succeeded", "confirmed"]);
  });

  it("month granularity: buckets a payment on its exact day and an invoice's whole period on that month's first day", async () => {
    const anchor = new Date(Date.UTC(2026, 7, 20));
    const range = buildRange("month", anchor);

    invoicesQuery.get.mockResolvedValue(docsOf([{ status: "confirmed", period: "2026-08", amount: 100 }]));
    paymentsQuery.get.mockResolvedValue(docsOf([{ status: "succeeded", amount: 50, createdAt: Date.UTC(2026, 7, 15) }]));

    const result = await analyticsRepository.monthlyRevenue(range);

    expect(result.find((p) => p.period === "2026-08-01")?.value).toBe(100);
    expect(result.find((p) => p.period === "2026-08-15")?.value).toBe(50);
  });

  it("5year granularity: buckets an invoice's period and a payment's createdAt by year", async () => {
    const anchor = new Date(Date.UTC(2026, 7, 20));
    const range = buildRange("5year", anchor);

    invoicesQuery.get.mockResolvedValue(docsOf([{ status: "confirmed", period: "2024-03", amount: 40 }]));
    paymentsQuery.get.mockResolvedValue(docsOf([{ status: "confirmed", amount: 60, createdAt: Date.UTC(2026, 2, 1) }]));

    const result = await analyticsRepository.monthlyRevenue(range);

    expect(result.find((p) => p.period === "2024")?.value).toBe(40);
    expect(result.find((p) => p.period === "2026")?.value).toBe(60);
  });

  it("ignores payments/invoices outside the requested window or in a non-terminal status", async () => {
    invoicesQuery.get.mockResolvedValue(docsOf([{ status: "confirmed", period: "2000-01", amount: 999 }]));
    paymentsQuery.get.mockResolvedValue(docsOf([{ status: "pending", amount: 999, createdAt: 0 }]));

    const result = await analyticsRepository.monthlyRevenue(buildRange("year"));

    expect(result.every((point) => point.value === 0)).toBe(true);
  });
});

describe("analyticsRepository.totalConfirmedRevenue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sums confirmed invoices and confirmed/succeeded payments across all time", async () => {
    invoicesQuery.get.mockResolvedValue(docsOf([{ amount: 200 }, { amount: 50 }]));
    paymentsQuery.get.mockResolvedValue(docsOf([{ amount: 30 }, { amount: 20 }]));

    await expect(analyticsRepository.totalConfirmedRevenue()).resolves.toBe(300);
  });
});

describe("analyticsRepository.activeStudentCountsByTeacher", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts distinct students per teacher, unioning active enrollments and active subscriptions", async () => {
    enrollmentsQuery.get.mockResolvedValue(
      docsOf([
        { teacherId: "t1", studentId: "s1", courseId: "c1" },
        { teacherId: "t1", studentId: "s2", courseId: "c1" },
      ]),
    );
    subscriptionsQuery.get.mockResolvedValue(
      docsOf([
        { teacherId: "t1", studentId: "s1", subjectId: "sub1" }, // same student as enrollment — counted once
        { teacherId: "t2", studentId: "s3", subjectId: "sub1" },
      ]),
    );

    const result = await analyticsRepository.activeStudentCountsByTeacher(buildRange("year"));

    expect(result).toEqual([
      { id: "t1", count: 2 },
      { id: "t2", count: 1 },
    ]);
    expect(enrollmentsQuery.where).toHaveBeenCalledWith("status", "==", "active");
    expect(subscriptionsQuery.where).toHaveBeenCalledWith("status", "==", "active");
  });

  it("returns an empty array when there is no active enrollment or subscription data", async () => {
    enrollmentsQuery.get.mockResolvedValue(docsOf([]));
    subscriptionsQuery.get.mockResolvedValue(docsOf([]));

    await expect(analyticsRepository.activeStudentCountsByTeacher(buildRange("year"))).resolves.toEqual([]);
  });
});

describe("analyticsRepository.activeStudentCountsBySubject", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves each enrollment's subjectId via its course and unions with subscriptions' own subjectId", async () => {
    enrollmentsQuery.get.mockResolvedValue(docsOf([{ teacherId: "t1", studentId: "s1", courseId: "c1" }]));
    subscriptionsQuery.get.mockResolvedValue(docsOf([{ teacherId: "t1", studentId: "s2", subjectId: "math" }]));
    coursesQuery.get.mockResolvedValue({ docs: [{ id: "c1", data: () => ({ subjectId: "math" }) }] });

    const result = await analyticsRepository.activeStudentCountsBySubject(buildRange("year"));

    expect(result).toEqual([{ id: "math", count: 2 }]);
  });

  it("skips enrollments whose course could not be resolved", async () => {
    enrollmentsQuery.get.mockResolvedValue(docsOf([{ teacherId: "t1", studentId: "s1", courseId: "missing" }]));
    subscriptionsQuery.get.mockResolvedValue(docsOf([]));
    coursesQuery.get.mockResolvedValue({ docs: [] });

    await expect(analyticsRepository.activeStudentCountsBySubject(buildRange("year"))).resolves.toEqual([]);
  });
});

describe("analyticsRepository.activeStudentIds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dedupes a student appearing in both an active enrollment and an active subscription", async () => {
    enrollmentsQuery.get.mockResolvedValue(docsOf([{ studentId: "s1" }, { studentId: "s2" }]));
    subscriptionsQuery.get.mockResolvedValue(docsOf([{ studentId: "s1" }, { studentId: "s3" }]));

    const result = await analyticsRepository.activeStudentIds(buildRange("year"));

    expect(new Set(result)).toEqual(new Set(["s1", "s2", "s3"]));
    expect(result).toHaveLength(3);
  });
});

describe("analyticsRepository.monthlySubscriptionGrowth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("buckets new subscriptions by day when granularity is month", async () => {
    const anchor = new Date(Date.UTC(2026, 7, 20));
    const range = buildRange("month", anchor);
    subscriptionsQuery.get.mockResolvedValue(docsOf([{ createdAt: Date.UTC(2026, 7, 3) }, { createdAt: Date.UTC(2026, 7, 3) }]));

    const result = await analyticsRepository.monthlySubscriptionGrowth(range);

    expect(result.find((p) => p.period === "2026-08-03")?.value).toBe(2);
    expect(result).toHaveLength(31);
  });
});
