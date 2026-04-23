import { NextResponse } from "next/server";
import { z } from "zod";

import { getHostSession } from "@/lib/auth";
import { importPartiesFromCsv } from "@/lib/repository";

const payloadSchema = z.object({
  csv: z.string().min(1),
});

export async function POST(request: Request) {
  const host = await getHostSession();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    const imported = await importPartiesFromCsv(payload.csv, host.email);
    return NextResponse.json({ imported });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import CSV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
