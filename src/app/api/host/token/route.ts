import { NextResponse } from "next/server";
import { z } from "zod";

import { getHostSession } from "@/lib/auth";
import { regeneratePartyToken } from "@/lib/repository";

const payloadSchema = z.object({
  partyId: z.string().min(1),
});

export async function POST(request: Request) {
  const host = await getHostSession();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    const token = await regeneratePartyToken(payload.partyId, host.email);
    return NextResponse.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to regenerate token.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
