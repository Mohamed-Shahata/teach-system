import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const updatePushPreference = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/teacherSettingsService", () => ({
  teacherSettingsService: { updatePushPreference },
}));

const { PATCH } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/teacher/settings/push", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/teacher/settings/push", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves the push preference", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    updatePushPreference.mockResolvedValue({
      uid: "teacher-1",
      email: "t@b.com",
      displayName: "Sara",
      pushEnabled: true,
    });

    const res = await PATCH(makeRequest({ enabled: true }));

    expect(res.status).toBe(200);
    expect(updatePushPreference).toHaveBeenCalledWith(
      { uid: "teacher-1", email: "t@b.com", role: "teacher" },
      true,
    );
  });

  it("rejects a malformed body", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });

    const res = await PATCH(makeRequest({}));

    expect(res.status).toBe(400);
    expect(updatePushPreference).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-teacher session", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    updatePushPreference.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ enabled: true }));

    expect(res.status).toBe(403);
  });
});
