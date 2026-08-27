import { describe, expect, it } from "vitest";

import { createSeedState } from "@/lib/seed-data";
import {
  itineraryForInvitation,
  resolveCheckInTableName,
} from "@/lib/sheets/google-store";

describe("resolveCheckInTableName", () => {
  const tableNames = new Map([
    [1, "Ornellaia"],
    [9, "St. George's"],
  ]);

  it.each([
    ["1", "Ornellaia"],
    ["Table 1", "Ornellaia"],
    ["table9", "St. George's"],
  ])("uses the editable seating name for %s", (storedName, expected) => {
    expect(resolveCheckInTableName(storedName, tableNames)).toBe(expected);
  });

  it("preserves a custom table value that is not a numeric table reference", () => {
    expect(resolveCheckInTableName("Terrace", tableNames)).toBe("Terrace");
  });

  it("keeps the stored reference when its table name is unavailable", () => {
    expect(resolveCheckInTableName("Table 15", tableNames)).toBe("Table 15");
  });
});

describe("itineraryForInvitation", () => {
  it.each(["19:00", "19:30"] as const)(
    "shows only the assigned %s shuttle departure",
    (transferTime) => {
      const itinerary = itineraryForInvitation(
        createSeedState().itinerary,
        true,
        transferTime,
      );
      const shuttle = itinerary
        .find((item) => item.id === "itinerary_party")
        ?.subItems?.find((item) => item.id === "itinerary_party_shuttle");

      expect(shuttle?.hours).toContain(`Departure Time \n${transferTime}`);
      expect(shuttle?.hours).not.toContain("From 19:00 to 19:30");
    },
  );

  it("shows the assigned departure to party-only invitees", () => {
    const itinerary = itineraryForInvitation(
      createSeedState().itinerary,
      false,
      "19:30",
    );
    const shuttle = itinerary
      .find((item) => item.id === "itinerary_party")
      ?.subItems?.find((item) => item.id === "itinerary_party_shuttle");

    expect(shuttle?.hours).toContain("Departure Time \n19:30");
  });

  it("keeps the existing shuttle window without an assignment", () => {
    const itinerary = itineraryForInvitation(createSeedState().itinerary, true);
    const shuttle = itinerary
      .find((item) => item.id === "itinerary_party")
      ?.subItems?.find((item) => item.id === "itinerary_party_shuttle");

    expect(shuttle?.hours).toContain("From 19:00 to 19:30");
  });
});
