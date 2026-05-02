import { NextResponse } from "next/server";
import { z } from "zod";

import { getHostSession } from "@/lib/auth";
import { updateContent } from "@/lib/repository";

const eventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string(),
  heroMonogram: z.string(),
  heroImageSrc: z.string(),
  heroBackImageSrc: z.string(),
  heroBackdropSrc: z.string(),
  paperTextureSrc: z.string(),
  summaryName: z.string(),
  summaryDateLabel: z.string(),
  summaryAddressName: z.string(),
  summaryAddressLabel: z.string(),
  introduction: z.string(),
  dressCode: z.string(),
  rsvpDeadline: z.string(),
  footerNote: z.string(),
});

const payloadSchema = z.object({
  event: eventSchema,
  questions: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      helpText: z.string().optional(),
      type: z.literal("checkbox"),
    }),
  ),
  itinerary: z.array(
    z.object({
      id: z.string(),
      dayLabel: z.string(),
      venueName: z.string(),
      address: z.string(),
      mapUrl: z.string(),
      title: z.string(),
      datetimeLabel: z.string(),
      dressCode: z.string(),
      description: z.string(),
      imageSrc: z.string(),
      note: z.string().optional(),
      subItems: z
        .array(
          z.object({
            id: z.string(),
            label: z.string().optional(),
            venueName: z.string().optional(),
            address: z.string().optional(),
            mapUrl: z.string().optional(),
            note: z.string().optional(),
            hours: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
  accommodations: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      city: z.string(),
      address: z.string(),
      addressLines: z.array(z.string()).optional(),
      phone: z.string(),
      ctaLabel: z.string(),
      ctaUrl: z.string(),
      imageSrc: z.string(),
      notes: z.string(),
    }),
  ),
});

export async function PATCH(request: Request) {
  const host = await getHostSession();
  if (!host) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    await updateContent(payload, host.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update content.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
