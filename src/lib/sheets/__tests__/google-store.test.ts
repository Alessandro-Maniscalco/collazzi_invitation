import { describe, expect, it } from "vitest";

import { createSeedState } from "@/lib/seed-data";
import { itineraryForInvitation } from "@/lib/sheets/google-store";

describe("itineraryForInvitation", () => {
  it("shows only the 19:00 shuttle departure to Florence dinner invitees", () => {
    const itinerary = itineraryForInvitation(createSeedState().itinerary, true);
    const shuttle = itinerary
      .find((item) => item.id === "itinerary_party")
      ?.subItems?.find((item) => item.id === "itinerary_party_shuttle");

    expect(shuttle?.hours).toContain("Departure Time \n19:00");
    expect(shuttle?.hours).not.toContain("19:30");
  });

  it("keeps the existing shuttle window for party-only invitees", () => {
    const itinerary = itineraryForInvitation(createSeedState().itinerary, false);
    const shuttle = itinerary
      .find((item) => item.id === "itinerary_party")
      ?.subItems?.find((item) => item.id === "itinerary_party_shuttle");

    expect(shuttle?.hours).toContain("From 19:00 to 19:30");
  });
});
