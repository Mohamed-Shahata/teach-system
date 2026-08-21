import { beforeEach, describe, expect, it, vi } from "vitest";

const listByRole = vi.fn();
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { listByRole },
}));

const listActiveStudentIds = vi.fn();
vi.mock("@/lib/server/repositories/subscriptionRepository", () => ({
  subscriptionRepository: { listActiveStudentIds },
}));

const { adminUnsubscribedStudentsService } = await import("./adminUnsubscribedStudentsService");
const { ForbiddenError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "admin", uid = "admin-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const STUDENTS = [
  { uid: "s1", email: "s1@example.com", displayName: "Sara", role: "student", createdAt: 2 },
  { uid: "s2", email: "s2@example.com", displayName: "Ali", phone: "0100", role: "student", createdAt: 3 },
  { uid: "s3", email: "s3@example.com", displayName: "Nour", role: "student", createdAt: 1 },
];

describe("adminUnsubscribedStudentsService.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(adminUnsubscribedStudentsService.list(makeSession("teacher"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("returns only students with zero active subscriptions, newest first", async () => {
    listByRole.mockResolvedValue(STUDENTS);
    listActiveStudentIds.mockResolvedValue(new Set(["s1"]));

    const result = await adminUnsubscribedStudentsService.list(makeSession());

    expect(listByRole).toHaveBeenCalledWith("student");
    expect(result.map((r) => r.uid)).toEqual(["s2", "s3"]);
    expect(result[0]).toEqual({ uid: "s2", displayName: "Ali", email: "s2@example.com", phone: "0100", createdAt: 3 });
  });

  it("returns an empty list when every student has an active subscription", async () => {
    listByRole.mockResolvedValue(STUDENTS);
    listActiveStudentIds.mockResolvedValue(new Set(["s1", "s2", "s3"]));

    const result = await adminUnsubscribedStudentsService.list(makeSession());

    expect(result).toEqual([]);
  });
});
