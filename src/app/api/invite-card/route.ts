import { NextResponse } from "next/server";

import { renderInviteCardImage } from "@/lib/providers/invite-card-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const partyLabel = url.searchParams.get("name")?.trim() || "Guest Name";

  const image = await renderInviteCardImage(partyLabel);

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/jpeg",
    },
  });
}
