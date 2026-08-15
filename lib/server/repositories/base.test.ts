import { describe, expect, it, vi } from "vitest";
import { scopeToTeacher, assertWritableByTeacher, resolveOwnerTeacherId } from "./base";
import { ForbiddenError } from "@/lib/errors";
import type { Session } from "@/lib/auth/session";

function makeSession(role: Session["role"], uid = "uid-1"): Session {
  return { uid, email: `${uid}@example.com`, role };
}

function makeFakeQuery() {
  const where = vi.fn().mockReturnValue("SCOPED_QUERY");
  return { where } as unknown as { where: typeof where };
}

describe("scopeToTeacher", () => {
  it("scopes the query by teacherId for a teacher session", () => {
    const query = makeFakeQuery();
    const session = makeSession("teacher", "teacher-1");

    // @ts-expect-error — fake query shape is enough for this unit test
    const result = scopeToTeacher(query, session);

    expect(query.where).toHaveBeenCalledWith("teacherId", "==", "teacher-1");
    expect(result).toBe("SCOPED_QUERY");
  });

  it("returns the query unscoped for an admin session", () => {
    const query = makeFakeQuery();
    const session = makeSession("admin");

    // @ts-expect-error — fake query shape is enough for this unit test
    const result = scopeToTeacher(query, session);

    expect(query.where).not.toHaveBeenCalled();
    expect(result).toBe(query);
  });

  it("throws ForbiddenError for a student session", () => {
    const query = makeFakeQuery();
    const session = makeSession("student");

    // @ts-expect-error — fake query shape is enough for this unit test
    expect(() => scopeToTeacher(query, session)).toThrow(ForbiddenError);
  });
});

describe("assertWritableByTeacher", () => {
  it("allows the owning teacher", () => {
    const session = makeSession("teacher", "teacher-1");
    expect(() => assertWritableByTeacher(session, { teacherId: "teacher-1" })).not.toThrow();
  });

  it("rejects a different teacher", () => {
    const session = makeSession("teacher", "teacher-2");
    expect(() => assertWritableByTeacher(session, { teacherId: "teacher-1" })).toThrow(ForbiddenError);
  });

  it("allows an admin regardless of owner", () => {
    const session = makeSession("admin");
    expect(() => assertWritableByTeacher(session, { teacherId: "teacher-1" })).not.toThrow();
  });

  it("rejects a student", () => {
    const session = makeSession("student");
    expect(() => assertWritableByTeacher(session, { teacherId: "teacher-1" })).toThrow(ForbiddenError);
  });
});

describe("resolveOwnerTeacherId", () => {
  it("returns the teacher's own uid for a teacher session, ignoring any explicit id", () => {
    const session = makeSession("teacher", "teacher-1");
    expect(resolveOwnerTeacherId(session, "teacher-2")).toBe("teacher-1");
    expect(resolveOwnerTeacherId(session)).toBe("teacher-1");
  });

  it("returns the explicit teacherId for an admin session", () => {
    const session = makeSession("admin");
    expect(resolveOwnerTeacherId(session, "teacher-9")).toBe("teacher-9");
  });

  it("throws if an admin omits the explicit teacherId", () => {
    const session = makeSession("admin");
    expect(() => resolveOwnerTeacherId(session)).toThrow(ForbiddenError);
  });

  it("throws for a student session", () => {
    const session = makeSession("student");
    expect(() => resolveOwnerTeacherId(session, "teacher-1")).toThrow(ForbiddenError);
  });
});
