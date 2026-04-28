import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { renderInviteCardImage } from "@/lib/providers/invite-card-image";

describe("renderInviteCardImage", () => {
  it("renders a fixed-aspect jpeg card with the guest name baked in", async () => {
    const image = await renderInviteCardImage("Alessandro Maniscalco");
    const metadata = await sharp(image).metadata();

    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(1254);
    expect(metadata.height).toBe(940);
    expect(image.byteLength).toBeGreaterThan(50_000);
  });
});
