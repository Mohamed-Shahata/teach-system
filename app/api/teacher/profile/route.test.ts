import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getMyProfile = vi.fn();
const updateMyProfile = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/teacherProfileService", () => ({
  teacherProfileService: { getMyProfile, updateMyProfile },
}));

const { GET, PATCH } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

describe("GET /api/teacher/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the teacher's own profile", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    getMyProfile.mockResolvedValue({ teacherId: "teacher-1", displayName: "Samir", completeness: 0 });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(getMyProfile).toHaveBeenCalledWith({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
  });

  it("returns 403 for a non-teacher session", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    getMyProfile.mockRejectedValue(new ForbiddenError());

    const res = await GET();

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/teacher/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/teacher/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  it("updates the profile with a partial body", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    updateMyProfile.mockResolvedValue({ teacherId: "teacher-1", specialization: "Physics", completeness: 17 });

    const res = await PATCH(makeRequest({ specialization: "Physics" }));

    expect(res.status).toBe(200);
    expect(updateMyProfile).toHaveBeenCalledWith(
      { uid: "teacher-1", email: "t@b.com", role: "teacher" },
      { specialization: "Physics" },
    );
  });

  it("rejects a malformed body", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });

    const res = await PATCH(makeRequest({ yearsOfExperience: -1 }));

    expect(res.status).toBe(400);
    expect(updateMyProfile).not.toHaveBeenCalled();
  });

  it("rejects an empty body", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });

    const res = await PATCH(makeRequest({}));

    expect(res.status).toBe(400);
    expect(updateMyProfile).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-teacher session", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    updateMyProfile.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ specialization: "Physics" }));

    expect(res.status).toBe(403);
  });
});
