import { beforeEach, describe, expect, it, vi } from "vitest";

const listByTeacher = vi.fn();
vi.mock("@/lib/server/repositories/paymentRepository", () => ({
  paymentRepository: { listByTeacher },
}));

const findByIds = vi.fn();
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findByIds },
}));

const findCoursesByIds = vi.fn();
vi.mock("@/lib/server/repositories/courseRepository", () => ({
  courseRepository: { findByIds: findCoursesByIds },
}));

const listInvoicesByTeacher = vi.fn();
vi.mock("@/lib/server/repositories/subscriptionInvoiceRepository", () => ({
  subscriptionInvoiceRepository: { listByTeacher: listInvoicesByTeacher },
}));

const findOfferingById = vi.fn();
vi.mock("@/lib/server/repositories/teacherOfferingRepository", () => ({
  teacherOfferingRepository: { findById: findOfferingById },
}));

const listSubjects = vi.fn();
vi.mock("@/lib/server/repositories/subjectRepository", () => ({
  subjectRepository: { list: listSubjects },
}));

const { adminPaymentsService, adminPaymentsOverviewService } = await import("./adminPaymentsService");
const { ForbiddenError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "admin", uid = "admin-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const PAYMENT = {
  id: "payment-1",
  studentId: "student-1",
  courseId: "course-1",
  teacherId: "teacher-1",
  amount: 300,
  currency: "EGP",
  method: "vodafone_cash" as const,
  status: "pending" as const,
  referenceNote: "01000000000",
  createdAt: 1,
  updatedAt: 1,
};

describe("adminPaymentsService.listAllPayments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(adminPaymentsService.listAllPayments(makeSession("teacher"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("joins each payment with student/teacher/course names", async () => {
    listByTeacher.mockResolvedValue([PAYMENT]);
    findByIds.mockResolvedValue(
      new Map([
        ["student-1", { uid: "student-1", displayName: "Sara", email: "s@example.com", role: "student", createdAt: 1 }],
        ["teacher-1", { uid: "teacher-1", displayName: "Mona", email: "m@example.com", role: "teacher", createdAt: 1 }],
      ]),
    );
    findCoursesByIds.mockResolvedValue(
      new Map([["course-1", { id: "course-1", title: { en: "Physics 101", ar: "فيزياء ١٠١" } }]]),
    );

    const result = await adminPaymentsService.listAllPayments(makeSession());

    expect(listByTeacher).toHaveBeenCalledWith(makeSession(), undefined);
    expect(result).toEqual([
      {
        id: "payment-1",
        studentId: "student-1",
        studentName: "Sara",
        courseId: "course-1",
        courseTitle: { en: "Physics 101", ar: "فيزياء ١٠١" },
        teacherId: "teacher-1",
        teacherName: "Mona",
        amount: 300,
        currency: "EGP",
        method: "vodafone_cash",
        status: "pending",
        referenceNote: "01000000000",
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
  });

  it("passes the status filter through and falls back to raw ids when a join misses", async () => {
    listByTeacher.mockResolvedValue([{ ...PAYMENT, referenceNote: undefined }]);
    findByIds.mockResolvedValue(new Map());
    findCoursesByIds.mockResolvedValue(new Map());

    const result = await adminPaymentsService.listAllPayments(makeSession(), "pending");

    expect(listByTeacher).toHaveBeenCalledWith(makeSession(), "pending");
    expect(result[0].studentName).toBe("student-1");
    expect(result[0].teacherName).toBe("teacher-1");
    expect(result[0].courseTitle).toEqual({ en: "course-1", ar: "course-1" });
    expect(result[0].referenceNote).toBeUndefined();
  });
});

const INVOICE = {
  id: "invoice-1",
  subscriptionId: "sub-1",
  studentId: "student-2",
  teacherId: "teacher-1",
  offeringId: "offering-1",
  period: "2026-08",
  amount: 200,
  currency: "EGP",
  status: "pending" as const,
  method: "cash" as const,
  createdAt: 2,
  updatedAt: 2,
};

describe("adminPaymentsOverviewService.listAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(adminPaymentsOverviewService.listAll(makeSession("teacher"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("merges payments and subscription invoices, sorted by recency, both normalized to a shared status space", async () => {
    listByTeacher.mockResolvedValue([{ ...PAYMENT, status: "succeeded", createdAt: 1 }]);
    listInvoicesByTeacher.mockResolvedValue([{ ...INVOICE, createdAt: 5 }]);
    findByIds.mockResolvedValue(
      new Map([
        ["student-1", { uid: "student-1", displayName: "Sara", email: "s@example.com", role: "student", createdAt: 1 }],
        ["student-2", { uid: "student-2", displayName: "Laila", email: "l@example.com", role: "student", createdAt: 1 }],
        ["teacher-1", { uid: "teacher-1", displayName: "Mona", email: "m@example.com", role: "teacher", createdAt: 1 }],
      ]),
    );
    findCoursesByIds.mockResolvedValue(
      new Map([["course-1", { id: "course-1", title: { en: "Physics 101", ar: "فيزياء ١٠١" } }]]),
    );
    findOfferingById.mockResolvedValue({
      id: "offering-1",
      teacherId: "teacher-1",
      subjectId: "subject-1",
      stageId: "stage-1",
      monthlyPrice: 200,
      createdAt: 1,
      updatedAt: 1,
    });
    listSubjects.mockResolvedValue([{ id: "subject-1", name: { en: "Arabic", ar: "عربي" } }]);

    const result = await adminPaymentsOverviewService.listAll(makeSession());

    expect(result).toHaveLength(2);
    // Most recent first.
    expect(result[0].source).toBe("subscriptionInvoice");
    expect(result[0].studentName).toBe("Laila");
    expect(result[0].itemLabel).toEqual({ en: "Arabic", ar: "عربي" });
    expect(result[0].status).toBe("pending");
    expect(result[1].source).toBe("payment");
    // A gateway "succeeded" payment normalizes to "confirmed" on the combined row.
    expect(result[1].status).toBe("confirmed");
  });

  it("filters both models by a normalized status", async () => {
    listByTeacher.mockResolvedValue([]);
    listInvoicesByTeacher.mockResolvedValue([]);
    findByIds.mockResolvedValue(new Map());
    findCoursesByIds.mockResolvedValue(new Map());
    listSubjects.mockResolvedValue([]);

    await adminPaymentsOverviewService.listAll(makeSession(), "confirmed");

    // "confirmed" can't be pushed down as a single repository status (it
    // covers both "succeeded" and "confirmed" payments), so both
    // repositories are called without a status filter and post-filtered.
    expect(listByTeacher).toHaveBeenCalledWith(makeSession());
    expect(listInvoicesByTeacher).toHaveBeenCalledWith(makeSession());

    await adminPaymentsOverviewService.listAll(makeSession(), "pending");
    expect(listByTeacher).toHaveBeenCalledWith(makeSession(), "pending");
    expect(listInvoicesByTeacher).toHaveBeenCalledWith(makeSession(), "pending");
  });
});
