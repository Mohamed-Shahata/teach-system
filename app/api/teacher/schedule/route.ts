import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { scheduleService } from "@/lib/server/services/scheduleService";
import {
  createScheduleSlotSchema,
  deleteScheduleSlotSchema,
  updateScheduleSlotWithIdSchema,
} from "@/lib/validation/schedule.schema";

export async function GET() {
  try {
    const session = await requireSession();
    const slots = await scheduleService.listSchedule(session);
    return NextResponse.json({ slots });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createScheduleSlotSchema.parse(await req.json());
    const slot = await scheduleService.createScheduleSlot(session, input);
    return NextResponse.json({ slot }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const input = updateScheduleSlotWithIdSchema.parse(await req.json());
    const slot = await scheduleService.updateScheduleSlot(session, input);
    return NextResponse.json({ slot });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    const { id } = deleteScheduleSlotSchema.parse(await req.json());
    await scheduleService.deleteScheduleSlot(session, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
