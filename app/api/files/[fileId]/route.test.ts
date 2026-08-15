import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const deleteFile = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/fileService", () => ({
  fileService: { deleteFile },
}));

const { DELETE } = await import("./route");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ fileId: "file-1" }) };

describe("/api/files/[fileId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("deletes a file", async () => {
    const res = await DELETE(new Request("http://localhost/api/files/file-1"), context);

    expect(res.status).toBe(200);
    expect(deleteFile).toHaveBeenCalledWith(session, "file-1");
  });

  it("returns 404 when the file doesn't exist", async () => {
    deleteFile.mockRejectedValue(new NotFoundError());
    const res = await DELETE(new Request("http://localhost/api/files/file-1"), context);
    expect(res.status).toBe(404);
  });

  it("maps ownership errors", async () => {
    deleteFile.mockRejectedValue(new ForbiddenError());
    const res = await DELETE(new Request("http://localhost/api/files/file-1"), context);
    expect(res.status).toBe(403);
  });
});
