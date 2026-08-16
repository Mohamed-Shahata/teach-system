import "server-only";
import { NotFoundError } from "@/lib/errors";
import {
  publicRepository,
  type PublicCourse,
  type PublicTeacherProfile,
} from "@/lib/server/repositories/publicRepository";

/**
 * Public service — TASK-1402.
 *
 * No `Session` param anywhere here (per docs/architecture/overview.md's
 * layering rules, still "Service → Repository", just with an anonymous
 * caller) since these back the unauthenticated `/teachers/[slug]` and
 * `/courses/[slug]` marketing pages. All access restriction already
 * happens in `publicRepository` (isPublic/published filtering + field
 * projection); this layer's job is just assembling what a page needs
 * and turning "not found" into a real error the page can 404 on.
 */

export interface PublicTeacherPage {
  profile: PublicTeacherProfile;
  courses: PublicCourse[];
}

export interface PublicCoursePage {
  course: PublicCourse;
  /** The owning teacher's public profile, or null if the teacher isn't public — the page still renders, just without a teacher link. */
  teacher: PublicTeacherProfile | null;
}

export const publicService = {
  /** `/teachers/[slug]` — throws NotFoundError if the slug doesn't resolve to a public profile. */
  async getTeacherPageBySlug(slug: string): Promise<PublicTeacherPage> {
    const profile = await publicRepository.findTeacherProfileBySlug(slug);
    if (!profile) {
      throw new NotFoundError();
    }
    const courses = await publicRepository.listPublishedCoursesByTeacher(profile.teacherId);
    return { profile, courses };
  },

  /**
   * `/courses/[slug]` — throws NotFoundError if the slug doesn't resolve
   * to a published course. `teacher` is null (not an error) when the
   * owning teacher's profile isn't public — the course itself is still
   * published/visible, it just can't link out to a teacher page.
   */
  async getCoursePageBySlug(slug: string): Promise<PublicCoursePage> {
    const course = await publicRepository.findPublishedCourseBySlug(slug);
    if (!course) {
      throw new NotFoundError();
    }
    const teacher = await publicRepository.findTeacherProfile(course.teacherId);
    return { course, teacher };
  },

  /** Landing page "public courses" section — a bounded sample of published courses from any teacher. */
  async listShowcaseCourses(limitCount = 6): Promise<PublicCourse[]> {
    return publicRepository.listPublishedCourses(limitCount);
  },

  /** Landing page "public teachers" section — a bounded sample of teachers who opted their profile public. */
  async listShowcaseTeachers(limitCount = 6): Promise<PublicTeacherProfile[]> {
    return publicRepository.listPublicTeacherProfiles(limitCount);
  },
};
