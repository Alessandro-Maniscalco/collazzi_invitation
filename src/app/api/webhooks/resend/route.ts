import { NextResponse } from "next/server";
import { z } from "zod";

import { updateDeliveryStatusFromWebhook } from "@/lib/repository";

const payloadSchema = z.object({
  data: z
    .object({
      email_id: z.string().optional(),
    })
    .optional(),
  type: z.string(),
});

export async function POST(request: Request) {
  const payload = payloadSchema.parse(await request.json());
  const messageId = payload.data?.email_id;

  if (!messageId) {
    return NextResponse.json({ ok: true });
  }

  const status =
    payload.type.includes("opened")
      ? "opened"
      : payload.type.includes("delivered")
        ? "delivered"
        : payload.type.includes("sent")
          ? "sent"
          : "failed";

  await updateDeliveryStatusFromWebhook(messageId, status);
  return NextResponse.json({ ok: true });
}
