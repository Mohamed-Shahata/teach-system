import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { educationStageRepository, type LocalizedText } from "@/lib/server/repositories/educationStageRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { computeAgeFromBirthDate, type UpdateStudentOwnProfileInput } from "@/lib/validation/user.schema";

/**
 * TASK-3201 — student-facing "my profile" (displayName, avatarUrl,
 * birthDate/age, read-only stageId). Sits directly on the existing
 * `users` doc rather than a new collection — unlike the teacher's
 * `teacherProfiles` (TASK-3101/3102), there's nothing here beyond fields
 * `userRepository` already owns plus one new one (`birthDate`). Avatar
 * upload itself is intentionally not duplicated here — it still goes
 * through TASK-1005's `studentSettingsService.updateAvatar` /
 * `PATCH /api/student/settings/avatar`; this service only adds
 * `birthDate`/`age` and a read-only `stageId` (+ its display name) on
 * top, and this page's form reuses the same avatar upload call.
 */

export interface MyStudentProfile {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  birthDate?: string;
  /**
   * Computed server-side from `birthDate` at read time — never stored —
   * so it can't go stale (see `phase-32-student-experience.md`'s
   * TASK-3201 note). Absent when `birthDate` isn't set.
   */
  age?: number;
  /** Read-only here — changing grade level is an Admin action (Student management "Edit"), not self-service, to keep enrollment/subscription data consistent. */
  stageId?: string;
  /** Denormalized display name for `stageId`, joined here so the page doesn't need a second round trip. Absent if `stageId` is unset or the referenced stage no longer exists. */
  stageName?: LocalizedText;
}

async function toProfile(user: {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  birthDate?: string;
  stageId?: string;
}): Promise<MyStudentProfile> {
  const stage = user.stageId ? await educationStageRepository.findById(user.stageId) : null;

  return {
    uid: user.uid,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    birthDate: user.birthDate,
    age: user.birthDate ? computeAgeFromBirthDate(user.birthDate) : undefined,
    stageId: user.stageId,
    stageName: stage?.name,
  };
}

export const studentProfileService = {
  async getMyProfile(session: Session): Promise<MyStudentProfile> {
    assertRole(session, "student");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();
    return toProfile(user);
  },

  async updateMyProfile(session: Session, input: UpdateStudentOwnProfileInput): Promise<MyStudentProfile> {
    assertRole(session, "student");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();

    await userRepository.updateProfile(session.uid, input);

    return toProfile({ ...user, ...input });
  },
};
