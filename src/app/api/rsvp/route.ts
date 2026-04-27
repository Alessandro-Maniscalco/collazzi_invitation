import { NextResponse } from "next/server";
import { z } from "zod";

import { saveRsvp } from "@/lib/repository";

const payloadSchema = z.object({
  token: z.string().min(1),
  selections: z.record(z.string(), z.boolean()),
  answers: z.record(z.string(), z.boolean()),
  note: z.string().max(1200).optional().default(""),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const response = await saveRsvp(payload);
    return NextResponse.json({ response });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save RSVP.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
