import { describe, expect, it } from "vitest";

import { guestMatchesSearch, normalizeGuestSearch, searchCheckInGuests } from "@/lib/check-in";
import type { CheckInGuest } from "@/lib/types";

const guests: CheckInGuest[] = [
  {
    partyId: "party_1",
    member: "guest_1",
    name: "Mário De' Rossi",
    checkedIn: false,
    tableName: "Olive",
  },
  {
    partyId: "party_2",
    member: "guest_1",
    name: "Anna Rossi",
    checkedIn: true,
  },
  {
    partyId: "party_2",
    member: "guest_2",
    name: "Luca Bianchi",
    checkedIn: false,
  },
];

describe("check-in search", () => {
  it("normalizes accents, punctuation, case, and whitespace", () => {
    expect(normalizeGuestSearch("  MÁRIO,  De' Rossi ")).toBe("mario de rossi");
  });

  it("matches partial first and last names in either order", () => {
    expect(guestMatchesSearch(guests[0], "ross mar")).toBe(true);
    expect(guestMatchesSearch(guests[0], "Mário Rossi")).toBe(true);
    expect(guestMatchesSearch(guests[0], "Bianchi")).toBe(false);
  });

  it("returns duplicate surnames as separate named people", () => {
    expect(searchCheckInGuests(guests, "Rossi").map((guest) => guest.name)).toEqual([
      "Anna Rossi",
      "Mário De' Rossi",
    ]);
  });
});
