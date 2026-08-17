import { describe, expect, it } from "vitest";
import { socialLinksSchema, updateTeacherProfileDetailsSchema } from "@/lib/validation/teacherProfile.schema";

describe("updateTeacherProfileDetailsSchema", () => {
  it("accepts an empty existing profile with no new fields as invalid (needs at least one field)", () => {
    expect(updateTeacherProfileDetailsSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a partial update with just bio", () => {
    const result = updateTeacherProfileDetailsSchema.safeParse({
      bio: { en: "Experienced physics teacher.", ar: "مدرس فيزياء ذو خبرة." },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a partial update with only one locale filled in bio/headline", () => {
    const result = updateTeacherProfileDetailsSchema.safeParse({
      bio: { en: "Only English for now." },
      headline: { ar: "معلم متميز" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a headline longer than 120 chars", () => {
    const result = updateTeacherProfileDetailsSchema.safeParse({
      headline: { en: "x".repeat(121) },
    });
    expect(result.success).toBe(false);
  });

  it("accepts yearsOfExperience as a non-negative integer", () => {
    expect(updateTeacherProfileDetailsSchema.safeParse({ yearsOfExperience: 12 }).success).toBe(true);
    expect(updateTeacherProfileDetailsSchema.safeParse({ yearsOfExperience: -1 }).success).toBe(false);
    expect(updateTeacherProfileDetailsSchema.safeParse({ yearsOfExperience: 3.5 }).success).toBe(false);
    expect(updateTeacherProfileDetailsSchema.safeParse({ yearsOfExperience: 200 }).success).toBe(false);
  });

  it("accepts a non-empty specialization string, rejects an empty one", () => {
    expect(updateTeacherProfileDetailsSchema.safeParse({ specialization: "IGCSE Physics" }).success).toBe(true);
    expect(updateTeacherProfileDetailsSchema.safeParse({ specialization: "" }).success).toBe(false);
  });

  it("rejects a malformed avatarUrl", () => {
    expect(updateTeacherProfileDetailsSchema.safeParse({ avatarUrl: "not-a-url" }).success).toBe(false);
    expect(
      updateTeacherProfileDetailsSchema.safeParse({ avatarUrl: "https://res.cloudinary.com/x/avatar.jpg" }).success,
    ).toBe(true);
  });
});

describe("socialLinksSchema", () => {
  it("accepts a subset of known keys as valid URLs", () => {
    const result = socialLinksSchema.safeParse({
      facebook: "https://facebook.com/teacher",
      whatsapp: "https://wa.me/201234567890",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (all keys optional)", () => {
    expect(socialLinksSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a malformed URL for any single key", () => {
    expect(socialLinksSchema.safeParse({ youtube: "youtube.com/not-a-full-url-scheme" }).success).toBe(false);
    expect(socialLinksSchema.safeParse({ instagram: "just some text" }).success).toBe(false);
  });

  it("rejects a social link over the max length", () => {
    const longUrl = `https://example.com/${"a".repeat(300)}`;
    expect(socialLinksSchema.safeParse({ website: longUrl }).success).toBe(false);
  });
});
