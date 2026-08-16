import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getProfile = vi.fn();
const updateDisplayName = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/studentSettingsService", () => ({
  studentSettingsService: { getProfile, updateDisplayName },
}));

const { GET, PATCH } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

describe("GET /api/student/settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the student's profile", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    getProfile.mockResolvedValue({ uid: "student-1", email: "s@b.com", displayName: "Nour" });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(getProfile).toHaveBeenCalledWith({ uid: "student-1", email: "s@b.com", role: "student" });
  });

  it("returns 403 for a non-student session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    getProfile.mockRejectedValue(new ForbiddenError());

    const res = await GET();

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/student/settings", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/student/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  it("updates the display name", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    updateDisplayName.mockResolvedValue({ uid: "student-1", email: "s@b.com", displayName: "New Name" });

    const res = await PATCH(makeRequest({ displayName: "New Name" }));

    expect(res.status).toBe(200);
    expect(updateDisplayName).toHaveBeenCalledWith(
      { uid: "student-1", email: "s@b.com", role: "student" },
      "New Name",
    );
  });

  it("rejects a malformed body", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });

    const res = await PATCH(makeRequest({ displayName: "a" }));

    expect(res.status).toBe(400);
    expect(updateDisplayName).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-student session", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    updateDisplayName.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ displayName: "New Name" }));

    expect(res.status).toBe(403);
  });
});
