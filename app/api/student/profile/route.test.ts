import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getMyProfile = vi.fn();
const updateMyProfile = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/studentProfileService", () => ({
  studentProfileService: { getMyProfile, updateMyProfile },
}));

const { GET, PATCH } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

describe("GET /api/student/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the student's own profile", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    getMyProfile.mockResolvedValue({ uid: "student-1", displayName: "Sara" });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(getMyProfile).toHaveBeenCalledWith({ uid: "student-1", email: "s@b.com", role: "student" });
  });

  it("returns 403 for a non-student session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    getMyProfile.mockRejectedValue(new ForbiddenError());

    const res = await GET();

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/student/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/student/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  it("updates the profile with a partial body", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    updateMyProfile.mockResolvedValue({ uid: "student-1", displayName: "Sara Ahmed" });

    const res = await PATCH(makeRequest({ displayName: "Sara Ahmed" }));

    expect(res.status).toBe(200);
    expect(updateMyProfile).toHaveBeenCalledWith(
      { uid: "student-1", email: "s@b.com", role: "student" },
      { displayName: "Sara Ahmed" },
    );
  });

  it("rejects a malformed birthDate", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });

    const res = await PATCH(makeRequest({ birthDate: "not-a-date" }));

    expect(res.status).toBe(400);
    expect(updateMyProfile).not.toHaveBeenCalled();
  });

  it("rejects an empty body", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });

    const res = await PATCH(makeRequest({}));

    expect(res.status).toBe(400);
    expect(updateMyProfile).not.toHaveBeenCalled();
  });

  it("silently ignores a client-supplied stageId (schema strips unknown keys, never accepted)", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    updateMyProfile.mockResolvedValue({ uid: "student-1", displayName: "Sara Ahmed" });

    const res = await PATCH(makeRequest({ displayName: "Sara Ahmed", stageId: "stage-2" }));

    expect(res.status).toBe(200);
    expect(updateMyProfile).toHaveBeenCalledWith(
      { uid: "student-1", email: "s@b.com", role: "student" },
      { displayName: "Sara Ahmed" },
    );
  });

  it("returns 403 for a non-student session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    updateMyProfile.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ displayName: "Sara Ahmed" }));

    expect(res.status).toBe(403);
  });
});
