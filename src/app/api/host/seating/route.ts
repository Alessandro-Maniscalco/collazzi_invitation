import { NextResponse } from "next/server";
import { z } from "zod";

import { getHostSession } from "@/lib/auth";
import {
  getSeatingSnapshot,
  moveSeatingGuest,
  renameSeatingTable,
} from "@/lib/seating-store";

export const dynamic = "force-dynamic";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("move"),
    guestId: z.string().trim().min(1),
    targetTableId: z.number().int().min(1).max(15).optional(),
    targetSeatPosition: z.number().int().min(1).max(10).optional(),
    mode: z.enum(["move", "switch", "drop"]),
  }),
  z.object({
    action: z.literal("rename"),
    tableId: z.number().int().min(1).max(15),
    name: z.string().trim().min(1).max(80),
  }),
]).refine(
  (value) =>
    value.action !== "move" ||
    (value.targetTableId === undefined) ===
      (value.targetSeatPosition === undefined),
  { message: "A destination needs both a table and a seat." },
);

export async function GET() {
  if (!(await getHostSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json(await getSeatingSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the seating plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await getHostSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = requestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid seating change." }, { status: 400 });
  }

  try {
    if (payload.data.action === "rename") {
      return NextResponse.json({
        table: await renameSeatingTable(payload.data.tableId, payload.data.name),
      });
    }

    return NextResponse.json(
      await moveSeatingGuest({
        guestId: payload.data.guestId,
        targetTableId: payload.data.targetTableId,
        targetSeatPosition: payload.data.targetSeatPosition,
        mode: payload.data.mode,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the seating change.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
