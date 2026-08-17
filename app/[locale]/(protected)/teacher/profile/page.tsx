import { requireSession } from "@/lib/auth/session";
import { teacherProfileService } from "@/lib/server/services/teacherProfileService";
import { TeacherProfileForm } from "@/components/teacher/teacher-profile-form";

/**
 * TASK-3102 — teacher-facing "edit my profile" page (own page, not a
 * settings modal): the TASK-3101 fields (bio, headline, years of
 * experience, specialization, social links, avatar) shown to students on
 * the directory card (TASK-2302) and public profile (Phase 27).
 */
export default async function TeacherProfilePage() {
  const session = await requireSession();
  const profile = await teacherProfileService.getMyProfile(session);

  return <TeacherProfileForm initialProfile={profile} />;
}
