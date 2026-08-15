import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const updateLesson = vi.fn();
const deleteLesson = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/lessonService", () => ({
  lessonService: { updateLesson, deleteLesson },
}));

const { DELETE, PATCH } = await import("./route");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ lessonId: "lesson-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/lessons/lesson-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("/api/lessons/[lessonId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("updates a lesson", async () => {
    updateLesson.mockResolvedValue({ id: "lesson-1", title: { en: "New", ar: "جديد" } });

    const res = await PATCH(makeRequest({ title: { en: "New", ar: "جديد" } }), context);

    expect(res.status).toBe(200);
    expect(updateLesson).toHaveBeenCalledWith(session, "lesson-1", { title: { en: "New", ar: "جديد" } });
  });

  it("returns 404 for a lesson that doesn't exist / isn't owned", async () => {
    updateLesson.mockRejectedValue(new NotFoundError());

    const res = await PATCH(makeRequest({ title: { en: "New", ar: "جديد" } }), context);

    expect(res.status).toBe(404);
  });

  it("deletes a lesson", async () => {
    const res = await DELETE(new Request("http://localhost/api/lessons/lesson-1"), context);

    expect(res.status).toBe(200);
    expect(deleteLesson).toHaveBeenCalledWith(session, "lesson-1");
  });

  it("maps ownership errors", async () => {
    deleteLesson.mockRejectedValue(new ForbiddenError());

    const res = await DELETE(new Request("http://localhost/api/lessons/lesson-1"), context);

    expect(res.status).toBe(403);
  });
});
