import { requireSession } from "@/lib/auth/session";
import { studentProfileService } from "@/lib/server/services/studentProfileService";
import { StudentProfileForm } from "@/components/student/student-profile-form";

/**
 * TASK-3201 — student-facing "my profile" page (own page, distinct from
 * `/student/settings`'s account page): `displayName`, avatar, birth
 * date/derived age, and a read-only grade level (`stageId`).
 */
export default async function StudentProfilePage() {
  const session = await requireSession();
  const profile = await studentProfileService.getMyProfile(session);

  return <StudentProfileForm initialProfile={profile} />;
}
