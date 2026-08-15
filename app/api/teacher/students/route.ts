import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";
import { requireSession } from "@/lib/auth/session";
import { accountService } from "@/lib/server/services/accountService";
import { studentService } from "@/lib/server/services/studentService";
import { createStudentSchema } from "@/lib/validation/account.schema";

/**
 * TASK-1002 — the teacher's student list, derived from their enrollments
 * (`studentService.listStudents`, itself built on TASK-1001's
 * teacher-scoped enrollment query).
 */
export async function GET() {
  try {
    const session = await requireSession();
    const students = await studentService.listStudents(session);
    return NextResponse.json({ students });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * TASK-604 — Teacher creates a Student account. Role gate is
 * `accountService.createStudentByTeacher` (`assertRole(session, "teacher")`);
 * this route only authenticates and validates the body.
 *
 * Optional pre-enrollment in one of the teacher's own courses (described in
 * `features/students.md`) is intentionally not implemented here — see the
 * note in `lib/server/services/accountService.ts`; it depends on the
 * payments/enrollment flow (Phase 11, Not Started).
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createStudentSchema.parse(await req.json());
    const account = await accountService.createStudentByTeacher(session, input);
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
