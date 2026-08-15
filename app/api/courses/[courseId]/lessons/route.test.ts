import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listLessons = vi.fn();
const createLesson = vi.fn();
const reorderLessons = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/lessonService", () => ({
  lessonService: { listLessons, createLesson, reorderLessons },
}));

const { GET, PATCH, POST } = await import("./route");
const { ForbiddenError, ValidationError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ courseId: "course-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/courses/course-1/lessons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("/api/courses/[courseId]/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("lists lessons for a course", async () => {
    listLessons.mockResolvedValue([{ id: "lesson-1", courseId: "course-1" }]);

    const res = await GET(new Request("http://localhost/api/courses/course-1/lessons"), context);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ lessons: [{ id: "lesson-1", courseId: "course-1" }] });
    expect(listLessons).toHaveBeenCalledWith(session, "course-1");
  });

  it("creates a lesson", async () => {
    createLesson.mockResolvedValue({ id: "lesson-1", courseId: "course-1" });

    const res = await POST(
      makeRequest({ title: { en: "Intro", ar: "مقدمة" } }),
      context,
    );

    expect(res.status).toBe(201);
    expect(createLesson).toHaveBeenCalledWith(session, "course-1", { title: { en: "Intro", ar: "مقدمة" } });
  });

  it("reorders lessons", async () => {
    reorderLessons.mockResolvedValue([{ id: "lesson-2" }, { id: "lesson-1" }]);

    const res = await PATCH(
      makeRequest({ lessonIds: ["lesson-2", "lesson-1"] }),
      context,
    );

    expect(res.status).toBe(200);
    expect(reorderLessons).toHaveBeenCalledWith(session, "course-1", ["lesson-2", "lesson-1"]);
  });

  it("maps a rejected reorder (mismatched id set) to 400", async () => {
    reorderLessons.mockRejectedValue(new ValidationError());

    const res = await PATCH(makeRequest({ lessonIds: ["lesson-1"] }), context);

    expect(res.status).toBe(400);
  });

  it("maps ownership errors", async () => {
    createLesson.mockRejectedValue(new ForbiddenError());

    const res = await POST(makeRequest({ title: { en: "Intro", ar: "مقدمة" } }), context);

    expect(res.status).toBe(403);
  });
});
