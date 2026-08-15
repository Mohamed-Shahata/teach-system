import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import type { Session } from "@/lib/auth/session";
import {
  assertRole,
  assertTeacherOwnsResource,
  assertStudentEnrolled,
  assertCanViewEnrollment,
} from "@/lib/auth/guards";

function session(role: Session["role"], uid = "u1"): Session {
  return { uid, email: `${uid}@x.com`, role };
}

describe("assertRole", () => {
  it("passes when the session role is in the allow-list", () => {
    expect(() => assertRole(session("teacher"), "teacher", "admin")).not.toThrow();
  });

  it("throws ForbiddenError when the session role is not allowed", () => {
    expect(() => assertRole(session("student"), "teacher", "admin")).toThrow(ForbiddenError);
  });
});

/**
 * Mirrors the "Create/edit/delete course" / "Manage lessons" / "Create/edit
 * quiz" / "Upload file to a course" rows of the permission matrix in
 * docs/authorization/README.md — all use the same owner-or-admin shape.
 */
describe("assertTeacherOwnsResource (course/lesson/quiz/file ownership)", () => {
  const resource = { teacherId: "teacher-1" };

  it("admin: allowed on any resource", () => {
    expect(() => assertTeacherOwnsResource(session("admin", "admin-1"), resource)).not.toThrow();
  });

  it("teacher (own resource): allowed", () => {
    expect(() =>
      assertTeacherOwnsResource(session("teacher", "teacher-1"), resource),
    ).not.toThrow();
  });

  it("teacher (other's resource): forbidden", () => {
    expect(() =>
      assertTeacherOwnsResource(session("teacher", "teacher-2"), resource),
    ).toThrow(ForbiddenError);
  });

  it("student: forbidden regardless of uid", () => {
    expect(() =>
      assertTeacherOwnsResource(session("student", "teacher-1"), resource),
    ).toThrow(ForbiddenError);
  });
});

/** Mirrors the "Take quiz" / enrolled-content-access rows. */
describe("assertStudentEnrolled", () => {
  const active = { studentId: "student-1", status: "active" as const };
  const cancelled = { studentId: "student-1", status: "cancelled" as const };

  it("admin: allowed even with no enrollment doc", () => {
    expect(() => assertStudentEnrolled(session("admin", "admin-1"), null)).not.toThrow();
  });

  it("student (enrolled, active): allowed", () => {
    expect(() =>
      assertStudentEnrolled(session("student", "student-1"), active),
    ).not.toThrow();
  });

  it("student (not enrolled — no doc): forbidden", () => {
    expect(() => assertStudentEnrolled(session("student", "student-1"), null)).toThrow(
      ForbiddenError,
    );
  });

  it("student (enrolled but cancelled): forbidden", () => {
    expect(() =>
      assertStudentEnrolled(session("student", "student-1"), cancelled),
    ).toThrow(ForbiddenError);
  });

  it("student (someone else's enrollment): forbidden", () => {
    expect(() =>
      assertStudentEnrolled(session("student", "student-2"), active),
    ).toThrow(ForbiddenError);
  });

  it("teacher: forbidden — this guard is student-only access, not the read-only teacher view", () => {
    expect(() =>
      assertStudentEnrolled(session("teacher", "teacher-1"), active),
    ).toThrow(ForbiddenError);
  });
});

/** Mirrors the "View own enrollment/progress" row (student own-only, teacher read-only aggregate). */
describe("assertCanViewEnrollment", () => {
  const enrollment = { studentId: "student-1", teacherId: "teacher-1", status: "active" as const };

  it("admin: allowed", () => {
    expect(() => assertCanViewEnrollment(session("admin", "admin-1"), enrollment)).not.toThrow();
  });

  it("the enrolled student: allowed", () => {
    expect(() =>
      assertCanViewEnrollment(session("student", "student-1"), enrollment),
    ).not.toThrow();
  });

  it("a different student: forbidden", () => {
    expect(() =>
      assertCanViewEnrollment(session("student", "student-2"), enrollment),
    ).toThrow(ForbiddenError);
  });

  it("the owning teacher: allowed (read-only aggregate)", () => {
    expect(() =>
      assertCanViewEnrollment(session("teacher", "teacher-1"), enrollment),
    ).not.toThrow();
  });

  it("a different teacher: forbidden", () => {
    expect(() =>
      assertCanViewEnrollment(session("teacher", "teacher-2"), enrollment),
    ).toThrow(ForbiddenError);
  });
});
