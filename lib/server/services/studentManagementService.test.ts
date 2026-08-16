import { beforeEach, describe, expect, it, vi } from "vitest";

const listByRole = vi.fn();
const findById = vi.fn();
const setDisabled = vi.fn();
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { listByRole, findById, setDisabled },
}));

const listByStudent = vi.fn();
vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { listByStudent },
}));

const list = vi.fn();
vi.mock("@/lib/server/repositories/educationStageRepository", () => ({
  educationStageRepository: { list },
}));

const updateUser = vi.fn();
vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminAuth: { updateUser },
}));

const { studentManagementService } = await import("./studentManagementService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "admin", uid = "admin-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const STAGES = [{ id: "stage-1", order: 1, name: { en: "Grade 3", ar: "3 ثانوي" }, category: "secondary" as const }];

const ENROLLMENTS = [
  { id: "e1", studentId: "s1", courseId: "c1", teacherId: "t1", status: "active", enrollmentDate: 1, progress: { completedLessonIds: [], percent: 0 } },
  { id: "e2", studentId: "s1", courseId: "c2", teacherId: "t1", status: "completed", enrollmentDate: 2, progress: { completedLessonIds: [], percent: 100 } },
];

describe("studentManagementService.listStudents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(studentManagementService.listStudents(makeSession("teacher"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("joins each student with derived enrollment stats and stage name", async () => {
    listByRole.mockResolvedValue([
      { uid: "s1", email: "s1@example.com", displayName: "Sara", role: "student", stageId: "stage-1", createdAt: 1 },
    ]);
    listByStudent.mockResolvedValue(ENROLLMENTS);
    list.mockResolvedValue(STAGES);

    const result = await studentManagementService.listStudents(makeSession());

    expect(listByRole).toHaveBeenCalledWith("student", undefined);
    expect(result).toEqual([
      {
        uid: "s1",
        displayName: "Sara",
        email: "s1@example.com",
        disabled: false,
        stageId: "stage-1",
        stageName: { en: "Grade 3", ar: "3 ثانوي" },
        stats: { totalEnrollments: 2, activeEnrollments: 1, completedEnrollments: 1 },
      },
    ]);
  });
});

describe("studentManagementService.getStudentDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the user doesn't exist or isn't a student", async () => {
    findById.mockResolvedValue(null);
    await expect(studentManagementService.getStudentDetail(makeSession(), "missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );

    findById.mockResolvedValue({ uid: "t1", role: "teacher" });
    await expect(studentManagementService.getStudentDetail(makeSession(), "t1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("returns the student joined with stats", async () => {
    findById.mockResolvedValue({
      uid: "s1",
      email: "s1@example.com",
      displayName: "Sara",
      role: "student",
      stageId: "stage-1",
      createdAt: 500,
    });
    listByStudent.mockResolvedValue(ENROLLMENTS);
    list.mockResolvedValue(STAGES);

    await expect(studentManagementService.getStudentDetail(makeSession(), "s1")).resolves.toEqual({
      uid: "s1",
      displayName: "Sara",
      email: "s1@example.com",
      disabled: false,
      stageId: "stage-1",
      stageName: { en: "Grade 3", ar: "3 ثانوي" },
      stats: { totalEnrollments: 2, activeEnrollments: 1, completedEnrollments: 1 },
      createdAt: 500,
    });
  });
});

describe("studentManagementService.setStudentDisabled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables the Firebase Auth account and mirrors the flag on the user doc", async () => {
    findById.mockResolvedValue({
      uid: "s1",
      email: "s1@example.com",
      displayName: "Sara",
      role: "student",
      createdAt: 500,
    });
    listByStudent.mockResolvedValue([]);
    list.mockResolvedValue([]);
    updateUser.mockResolvedValue(undefined);
    setDisabled.mockResolvedValue(undefined);

    const result = await studentManagementService.setStudentDisabled(makeSession(), "s1", true);

    expect(updateUser).toHaveBeenCalledWith("s1", { disabled: true });
    expect(setDisabled).toHaveBeenCalledWith("s1", true);
    expect(result.disabled).toBe(true);
  });

  it("throws NotFoundError for a non-student target", async () => {
    findById.mockResolvedValue(null);
    await expect(studentManagementService.setStudentDisabled(makeSession(), "missing", true)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
