import { NextResponse } from "next/server";
import { z } from "zod";

import { getHostSession } from "@/lib/auth";
import { sendBatch } from "@/lib/repository";

const deliveryStatusSchema = z.enum(["sandbox", "queued", "sent", "delivered", "opened", "failed"]);
const lastDeliveryStatusSchema = z.union([deliveryStatusSchema, z.literal("none"), z.literal("blank")]);
const payloadSchema = z.object({
  partyIds: z.array(z.string()).optional(),
  channels: z.array(z.literal("email")).min(1),
  filter: z.enum(["all", "awaiting_response", "attending", "not_attending"]).optional(),
  source: z.string().trim().min(1).optional(),
  sources: z.array(z.string().trim().min(1)).optional(),
  comingToParty: z.boolean().optional(),
  coming_to_party: z.boolean().optional(),
  lastDeliveryStatus: lastDeliveryStatusSchema.optional(),
  last_delivery_status: lastDeliveryStatusSchema.optional(),
}).transform(({ coming_to_party, last_delivery_status, ...payload }) => {
  const lastDeliveryStatus = payload.lastDeliveryStatus ?? last_delivery_status;
  const sources = payload.sources?.length ? payload.sources : undefined;

  return {
    ...payload,
    sources,
    comingToParty: payload.comingToParty ?? coming_to_party,
    lastDeliveryStatus: lastDeliveryStatus === "blank" ? "none" : lastDeliveryStatus,
  };
});

export async function POST(request: Request) {
  const host = await getHostSession();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    const deliveries = await sendBatch({ ...payload, kind: "reminder" }, host.email);
    return NextResponse.json({ deliveries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send reminders.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
