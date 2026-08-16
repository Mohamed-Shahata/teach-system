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

const { adminPaymentsService } = await import("./adminPaymentsService");
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
