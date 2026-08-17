import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const updatePushPreference = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/studentSettingsService", () => ({
  studentSettingsService: { updatePushPreference },
}));

const { PATCH } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/student/settings/push", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/student/settings/push", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves the push preference", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    updatePushPreference.mockResolvedValue({
      uid: "student-1",
      email: "s@b.com",
      displayName: "Nour",
      pushEnabled: false,
    });

    const res = await PATCH(makeRequest({ enabled: false }));

    expect(res.status).toBe(200);
    expect(updatePushPreference).toHaveBeenCalledWith(
      { uid: "student-1", email: "s@b.com", role: "student" },
      false,
    );
  });

  it("rejects a malformed body", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });

    const res = await PATCH(makeRequest({ enabled: "yes" }));

    expect(res.status).toBe(400);
    expect(updatePushPreference).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-student session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    updatePushPreference.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ enabled: true }));

    expect(res.status).toBe(403);
  });
});
