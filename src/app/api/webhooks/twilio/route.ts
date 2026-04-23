import { NextResponse } from "next/server";

import { updateDeliveryStatusFromWebhook } from "@/lib/repository";

export async function POST(request: Request) {
  const formData = await request.formData();
  const messageId = formData.get("MessageSid");
  const status = String(formData.get("MessageStatus") ?? "");

  if (!messageId) {
    return NextResponse.json({ ok: true });
  }

  const normalizedStatus =
    status === "delivered"
      ? "delivered"
      : status === "sent" || status === "queued"
        ? "sent"
        : "failed";

  await updateDeliveryStatusFromWebhook(String(messageId), normalizedStatus);
  return NextResponse.json({ ok: true });
}
