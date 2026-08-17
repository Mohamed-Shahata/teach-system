import { describe, expect, it } from "vitest";
import { computeAgeFromBirthDate, updateStudentOwnProfileSchema } from "@/lib/validation/user.schema";

describe("computeAgeFromBirthDate", () => {
  it("computes a whole-years age when the birthday already passed this year", () => {
    const today = new Date(Date.UTC(2026, 7, 18)); // Aug 18, 2026
    expect(computeAgeFromBirthDate("2016-01-01", today)).toBe(10);
  });

  it("does not count this year's birthday if it hasn't happened yet", () => {
    const today = new Date(Date.UTC(2026, 7, 18)); // Aug 18, 2026
    expect(computeAgeFromBirthDate("2016-12-31", today)).toBe(9);
  });

  it("counts the birthday on the exact day it occurs", () => {
    const today = new Date(Date.UTC(2026, 7, 18)); // Aug 18, 2026
    expect(computeAgeFromBirthDate("2016-08-18", today)).toBe(10);
  });
});

describe("updateStudentOwnProfileSchema", () => {
  it("rejects an empty body (needs at least one field)", () => {
    expect(updateStudentOwnProfileSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a partial update with just displayName", () => {
    const result = updateStudentOwnProfileSchema.safeParse({ displayName: "Sara Ahmed" });
    expect(result.success).toBe(true);
  });

  it("accepts a plausible birthDate on its own", () => {
    const result = updateStudentOwnProfileSchema.safeParse({ birthDate: "2016-01-01" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed birthDate string", () => {
    expect(updateStudentOwnProfileSchema.safeParse({ birthDate: "01/01/2016" }).success).toBe(false);
    expect(updateStudentOwnProfileSchema.safeParse({ birthDate: "not-a-date" }).success).toBe(false);
  });

  it("rejects a birthDate in the future", () => {
    const futureYear = new Date().getUTCFullYear() + 1;
    expect(updateStudentOwnProfileSchema.safeParse({ birthDate: `${futureYear}-01-01` }).success).toBe(false);
  });

  it("rejects a birthDate implying an age outside the plausible student range", () => {
    const now = new Date();
    const tooYoung = `${now.getUTCFullYear()}-01-01`;
    const tooOld = `${now.getUTCFullYear() - 40}-01-01`;
    expect(updateStudentOwnProfileSchema.safeParse({ birthDate: tooYoung }).success).toBe(false);
    expect(updateStudentOwnProfileSchema.safeParse({ birthDate: tooOld }).success).toBe(false);
  });

  it("rejects displayName shorter than 2 chars", () => {
    expect(updateStudentOwnProfileSchema.safeParse({ displayName: "A" }).success).toBe(false);
  });
});
