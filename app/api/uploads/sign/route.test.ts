import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const signUpload = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/uploadService", () => ({
  uploadService: { signUpload },
}));

const { POST } = await import("./route");
const { ForbiddenError, UnauthorizedError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/uploads/sign", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("/api/uploads/sign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("signs a valid request", async () => {
    signUpload.mockResolvedValue({
      signature: "sig",
      timestamp: 123,
      apiKey: "key",
      cloudName: "cloud",
      folder: "teachers/teacher-1/courses/_pending/thumbnail",
    });

    const res = await POST(makeRequest({ target: "course-thumbnail" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      signature: "sig",
      timestamp: 123,
      apiKey: "key",
      cloudName: "cloud",
      folder: "teachers/teacher-1/courses/_pending/thumbnail",
    });
    expect(signUpload).toHaveBeenCalledWith(session, { target: "course-thumbnail" });
  });

  it("returns 400 for an unknown target", async () => {
    const res = await POST(makeRequest({ target: "not-a-real-target" }));

    expect(res.status).toBe(400);
    expect(signUpload).not.toHaveBeenCalled();
  });

  it("maps auth and ownership errors", async () => {
    requireSession.mockRejectedValueOnce(new UnauthorizedError());
    await expect(POST(makeRequest({ target: "course-thumbnail" }))).resolves.toHaveProperty("status", 401);

    requireSession.mockResolvedValueOnce(session);
    signUpload.mockRejectedValueOnce(new ForbiddenError());
    await expect(POST(makeRequest({ target: "course-thumbnail" }))).resolves.toHaveProperty("status", 403);
  });
});
