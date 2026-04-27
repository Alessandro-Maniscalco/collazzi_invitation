import { NextResponse } from "next/server";
import { z } from "zod";

import { saveGuestEmail } from "@/lib/repository";

const payloadSchema = z.object({
  token: z.string().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const result = await saveGuestEmail(payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save email.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
