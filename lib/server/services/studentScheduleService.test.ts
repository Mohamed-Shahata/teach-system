import { beforeEach, describe, expect, it, vi } from "vitest";

const listByStudentSubscriptions = vi.fn();
const listByTeacherIds = vi.fn();
const findByIdsProfiles = vi.fn();
const listSubjects = vi.fn();

vi.mock("@/lib/server/repositories/subscriptionRepository", () => ({
  subscriptionRepository: { listByStudent: listByStudentSubscriptions },
}));
vi.mock("@/lib/server/repositories/scheduleRepository", () => ({
  scheduleRepository: { listByTeacherIds },
}));
vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  teacherProfileRepository: { findByIds: findByIdsProfiles },
}));
vi.mock("@/lib/server/repositories/subjectRepository", () => ({
  subjectRepository: { list: listSubjects },
}));

const { studentScheduleService } = await import("./studentScheduleService");
const { ForbiddenError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "student-1") {
  return { uid, email: `${uid}@example.com`, role };
}

function subscription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sub-1",
    studentId: "student-1",
    teacherId: "teacher-1",
    offeringId: "off-1",
    subjectId: "physics",
    stageId: "stage-1",
    status: "active",
    createdAt: 1000,
    ...overrides,
  };
}

function slot(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "slot-1",
    teacherId: "teacher-1",
    subjectId: "physics",
    stageId: "stage-1",
    dayOfWeek: 2,
    startTime: "17:00",
    durationMinutes: 60,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("studentScheduleService.listMySchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSubjects.mockResolvedValue([{ id: "physics", name: { en: "Physics", ar: "فيزياء" }, createdAt: 1 }]);
  });

  it("rejects a non-student session", async () => {
    await expect(studentScheduleService.listMySchedule(makeSession("teacher"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("returns an empty list without querying schedule when there are no active subscriptions", async () => {
    listByStudentSubscriptions.mockResolvedValue([subscription({ status: "cancelled" })]);

    const result = await studentScheduleService.listMySchedule(makeSession("student"));

    expect(listByTeacherIds).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("scopes to active-subscription teacherIds and joins teacher name + subject name", async () => {
    listByStudentSubscriptions.mockResolvedValue([
      subscription({ teacherId: "teacher-1", status: "active" }),
      subscription({ teacherId: "teacher-2", status: "cancelled" }),
    ]);
    listByTeacherIds.mockResolvedValue([slot()]);
    findByIdsProfiles.mockResolvedValue(
      new Map([["teacher-1", { teacherId: "teacher-1", displayName: "Yara", slug: "yara", isPublic: true, createdAt: 1, stats: {} }]]),
    );

    const result = await studentScheduleService.listMySchedule(makeSession("student"));

    expect(listByTeacherIds).toHaveBeenCalledWith(["teacher-1"]);
    expect(result).toEqual([
      expect.objectContaining({
        id: "slot-1",
        teacherId: "teacher-1",
        teacherName: "Yara",
        subjectName: { en: "Physics", ar: "فيزياء" },
      }),
    ]);
  });

  it("dedupes teacherIds across multiple active subscriptions with the same teacher", async () => {
    listByStudentSubscriptions.mockResolvedValue([
      subscription({ id: "sub-1", teacherId: "teacher-1", offeringId: "off-1" }),
      subscription({ id: "sub-2", teacherId: "teacher-1", offeringId: "off-2" }),
    ]);
    listByTeacherIds.mockResolvedValue([]);
    findByIdsProfiles.mockResolvedValue(new Map());

    await studentScheduleService.listMySchedule(makeSession("student"));

    expect(listByTeacherIds).toHaveBeenCalledWith(["teacher-1"]);
  });
});
