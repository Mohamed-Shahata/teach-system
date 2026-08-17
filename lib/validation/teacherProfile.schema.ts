import { z } from "zod";
import { localizedOptionalTextSchema } from "@/lib/validation/common.schema";

/**
 * `teacherProfiles` extension schemas (TASK-3101) — the richer fields a
 * teacher fills in via TASK-3102's "edit my profile" page and students see
 * on the Phase 23 directory / Phase 27 public profile page. All fields are
 * optional so existing profiles (`displayName`, `isPublic`, `stats`) stay
 * valid without a migration.
 */

/** Same bilingual-map shape as `localizedOptionalTextSchema` but capped
 * short — this is a one-line tagline (directory card), not a description. */
export const localizedHeadlineSchema = z.object({
  en: z.string().trim().max(120).optional(),
  ar: z.string().trim().max(120).optional(),
});

/** Bio reuses the existing bilingual-optional-text shape (courses/lessons already use it), capped at 2000 chars per language. */
export const teacherBioSchema = localizedOptionalTextSchema;

const yearsOfExperienceField = z.coerce.number().int().min(0).max(80);

const specializationField = z.string().trim().min(1).max(120);

/** Free-text URL fields — validated as URLs, matches `course.schema.ts`'s `thumbnailUrl`. `whatsapp` is a `wa.me`/`https://wa.me` link, not a raw phone number (raw phone already lives on `users.phone`, see `account.schema.ts`). */
export const socialLinksSchema = z
  .object({
    facebook: z.string().trim().url().max(300).optional(),
    youtube: z.string().trim().url().max(300).optional(),
    whatsapp: z.string().trim().url().max(300).optional(),
    instagram: z.string().trim().url().max(300).optional(),
    tiktok: z.string().trim().url().max(300).optional(),
    website: z.string().trim().url().max(300).optional(),
  })
  .partial();

const avatarUrlField = z.string().trim().url().max(500);

export const updateTeacherProfileDetailsSchema = z
  .object({
    bio: teacherBioSchema,
    headline: localizedHeadlineSchema,
    yearsOfExperience: yearsOfExperienceField,
    specialization: specializationField,
    socialLinks: socialLinksSchema,
    avatarUrl: avatarUrlField,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "errors.validation",
  });
export type UpdateTeacherProfileDetailsInput = z.infer<typeof updateTeacherProfileDetailsSchema>;
