import { describe, expect, it } from "vitest";

import {
  assertRsvpChangeAllowed,
  hasFullRsvpAccess,
} from "@/lib/rsvp-policy";

describe("RSVP change policy", () => {
  it("keeps full RSVP access for the Diana source", () => {
    expect(hasFullRsvpAccess(" Diana ")).toBe(true);
    expect(() => assertRsvpChangeAllowed("Diana", { guest_1: true })).not.toThrow();
  });

  it("allows other sources to decline but not add attendees", () => {
    expect(() =>
      assertRsvpChangeAllowed("Ale", { guest_1: false, guest_2: false }),
    ).not.toThrow();
    expect(() => assertRsvpChangeAllowed("Ale", { guest_1: true })).toThrow(
      "RSVPs are closed. You can still change your response to Will not attend.",
    );
  });
});
