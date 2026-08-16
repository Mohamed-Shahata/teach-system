import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { systemStatsRepository } from "@/lib/server/repositories/systemStatsRepository";

/**
 * TASK-1902 — System-wide stats overview. Admin-only, same reasoning as
 * `centerConfigService`'s write methods: there is no owning teacher to
 * check against, so this is a plain role check rather than the
 * teacher-ownership guards in `base.ts`/`guards.ts`.
 */
export const systemStatsService = {
  async getStats(session: Session) {
    assertRole(session, "admin");
    return systemStatsRepository.find();
  },
};
