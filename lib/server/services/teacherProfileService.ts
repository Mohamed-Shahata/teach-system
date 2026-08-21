import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import {
  teacherProfileRepository,
  type LocalizedText,
  type TeacherProfileSocialLinks,
} from "@/lib/server/repositories/teacherProfileRepository";
import type { UpdateTeacherProfileDetailsInput } from "@/lib/validation/teacherProfile.schema";

/**
 * TASK-3102 — teacher-facing "edit my profile" service, sitting on top of
 * TASK-3101's schema/repository. Self-service only (session.uid is always
 * the teacherId — `teacherProfiles` doc id === teacher uid, same as
 * `teacherSettingsService`), distinct from `teacherManagementService`'s
 * Admin-only `updateProfileFields` (name/subject).
 */

export interface MyTeacherProfile {
  teacherId: string;
  slug: string;
  displayName: string;
  isPublic: boolean;
  bio?: LocalizedText;
  headline?: LocalizedText;
  yearsOfExperience?: number;
  specialization?: string;
  socialLinks?: TeacherProfileSocialLinks;
  avatarUrl?: string;
  /** 0–100, one of the six TASK-3101 fields per completed point — nudges
   * completion without blocking anything (this page has no required
   * fields; a teacher can save any subset). */
  completeness: number;
}

const COMPLETENESS_FIELD_COUNT = 6;

function hasLocalizedText(value?: LocalizedText): boolean {
  return Boolean(value && (value.en || value.ar));
}

function computeCompleteness(profile: {
  bio?: LocalizedText;
  headline?: LocalizedText;
  yearsOfExperience?: number;
  specialization?: string;
  socialLinks?: TeacherProfileSocialLinks;
  avatarUrl?: string;
}): number {
  let filled = 0;
  if (hasLocalizedText(profile.bio)) filled += 1;
  if (hasLocalizedText(profile.headline)) filled += 1;
  if (typeof profile.yearsOfExperience === "number") filled += 1;
  if (profile.specialization) filled += 1;
  if (profile.socialLinks && Object.keys(profile.socialLinks).length > 0) filled += 1;
  if (profile.avatarUrl) filled += 1;
  return Math.round((filled / COMPLETENESS_FIELD_COUNT) * 100);
}

export const teacherProfileService = {
  async getMyProfile(session: Session): Promise<MyTeacherProfile> {
    assertRole(session, "teacher");
    const profile = await teacherProfileRepository.findByTeacherId(session.uid);
    if (!profile) throw new NotFoundError();

    return {
      teacherId: profile.teacherId,
      slug: profile.slug,
      displayName: profile.displayName,
      isPublic: profile.isPublic,
      bio: profile.bio,
      headline: profile.headline,
      yearsOfExperience: profile.yearsOfExperience,
      specialization: profile.specialization,
      socialLinks: profile.socialLinks,
      avatarUrl: profile.avatarUrl,
      completeness: computeCompleteness(profile),
    };
  },

  /**
   * TASK-3307 — Admin-facing read of one teacher's profile (bio,
   * headline, experience, socials, avatar), for the Admin account page.
   * Same shape as `getMyProfile` but keyed by an explicit `teacherId`
   * instead of `session.uid`, since the caller here is never the teacher
   * themselves. Returns `null` instead of throwing when no
   * `teacherProfiles` doc exists yet, so the Admin page can render the
   * rest of the account (auth/stats/offerings/courses) without a 404.
   */
  async getProfileForAdmin(session: Session, teacherId: string): Promise<MyTeacherProfile | null> {
    assertRole(session, "admin");
    const profile = await teacherProfileRepository.findByTeacherId(teacherId);
    if (!profile) return null;

    return {
      teacherId: profile.teacherId,
      slug: profile.slug,
      displayName: profile.displayName,
      isPublic: profile.isPublic,
      bio: profile.bio,
      headline: profile.headline,
      yearsOfExperience: profile.yearsOfExperience,
      specialization: profile.specialization,
      socialLinks: profile.socialLinks,
      avatarUrl: profile.avatarUrl,
      completeness: computeCompleteness(profile),
    };
  },

  async updateMyProfile(session: Session, input: UpdateTeacherProfileDetailsInput): Promise<MyTeacherProfile> {
    assertRole(session, "teacher");
    const existing = await teacherProfileRepository.findByTeacherId(session.uid);
    if (!existing) throw new NotFoundError();

    await teacherProfileRepository.updateDetails(session.uid, input);

    const merged = { ...existing, ...input };
    return {
      teacherId: existing.teacherId,
      slug: existing.slug,
      displayName: existing.displayName,
      isPublic: existing.isPublic,
      bio: merged.bio,
      headline: merged.headline,
      yearsOfExperience: merged.yearsOfExperience,
      specialization: merged.specialization,
      socialLinks: merged.socialLinks,
      avatarUrl: merged.avatarUrl,
      completeness: computeCompleteness(merged),
    };
  },
};
