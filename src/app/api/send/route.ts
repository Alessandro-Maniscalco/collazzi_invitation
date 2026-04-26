import { NextResponse } from "next/server";
import { z } from "zod";

import { getHostSession } from "@/lib/auth";
import { sendBatch } from "@/lib/repository";

const payloadSchema = z.object({
  partyIds: z.array(z.string()).optional(),
  channels: z.array(z.literal("email")).min(1),
  filter: z.enum(["all", "awaiting_response", "attending", "not_attending"]).optional(),
});

export async function POST(request: Request) {
  const host = await getHostSession();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    const deliveries = await sendBatch({ ...payload, kind: "invite" }, host.email);
    return NextResponse.json({ deliveries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send invitations.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
