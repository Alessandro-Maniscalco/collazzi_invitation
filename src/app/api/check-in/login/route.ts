import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  CHECKIN_COOKIE_NAME,
  createCheckInSessionValue,
  hasCheckInConfig,
  verifyCheckInPin,
} from "@/lib/check-in-auth";

const payloadSchema = z.object({
  pin: z.string().trim().min(1),
});

export async function POST(request: Request) {
  if (!hasCheckInConfig()) {
    return NextResponse.json({ error: "Check-in is not configured." }, { status: 503 });
  }

  const payload = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success || !verifyCheckInPin(payload.data.pin)) {
    return NextResponse.json({ error: "The PIN is incorrect." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(CHECKIN_COOKIE_NAME, createCheckInSessionValue(), {
    httpOnly: true,
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
