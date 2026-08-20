import { NextResponse } from "next/server";
import { z } from "zod";

import { hasCheckInSession } from "@/lib/check-in-auth";
import {
  CheckInGuestUnavailableError,
  getCheckInGuests,
  updateCheckIn,
} from "@/lib/repository";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  partyId: z.string().trim().min(1),
  member: z.enum(["guest_1", "guest_2"]),
  checkedIn: z.boolean(),
});

export async function GET() {
  if (!(await hasCheckInSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json({ guests: await getCheckInGuests() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load guests.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await hasCheckInSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = updateSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid check-in request." }, { status: 400 });
  }

  try {
    const guest = await updateCheckIn(
      payload.data.partyId,
      payload.data.member,
      payload.data.checkedIn,
    );
    return NextResponse.json({ guest });
  } catch (error) {
    if (error instanceof CheckInGuestUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Unable to update check-in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
