import { NextResponse } from "next/server";
import { z } from "zod";

import { getHostSession } from "@/lib/auth";
import { addGuest } from "@/lib/repository";

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  },
  z.string().email().optional(),
);

const optionalText = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  },
  z.string().optional(),
);

const payloadSchema = z.object({
  last_name: z.string().trim().min(1),
  first_name: z.string().trim().min(1),
  email: optionalEmail,
  invited_by_ale: z.boolean().default(false),
  invited_by_bona: z.boolean().default(false),
  invited_by_mum: z.boolean().default(false),
  source: optionalText,
  will_invite_to_walking_dinner: z.boolean().default(false),
  sent_whatsapp_save_the_date: z.boolean().default(false),
  sent_instagram_save_the_date: z.boolean().default(false),
});

export async function POST(request: Request) {
  const host = await getHostSession();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    const guest = await addGuest(
      {
        lastName: payload.last_name,
        firstName: payload.first_name,
        email: payload.email,
        invitedByAle: payload.invited_by_ale,
        invitedByBona: payload.invited_by_bona,
        invitedByMum: payload.invited_by_mum,
        source: payload.source,
        willInviteToWalkingDinner: payload.will_invite_to_walking_dinner,
        sentWhatsappSaveTheDate: payload.sent_whatsapp_save_the_date,
        sentInstagramSaveTheDate: payload.sent_instagram_save_the_date,
      },
      host.email,
    );

    return NextResponse.json({ guest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add guest.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
