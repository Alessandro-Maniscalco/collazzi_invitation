import { describe, expect, it } from "vitest";

import { partyAttendanceSummary } from "@/lib/formatters";
import type { Guest, Party } from "@/lib/types";

describe("partyAttendanceSummary", () => {
  it("counts guest selections when a response exists", () => {
    const guests: Guest[] = [
      { id: "guest_1", partyId: "party_1", name: "Guest 1" },
      { id: "guest_2", partyId: "party_1", name: "Guest 2" },
    ];
    const party: Party = {
      id: "party_1",
      label: "Test Party",
      guestIds: ["guest_1", "guest_2"],
      tags: [],
      token: { value: "token", active: true },
      deliveryIds: [],
      response: {
        status: "attending",
        guestSelections: { guest_1: true, guest_2: false },
        answers: {},
        note: "",
        updatedAt: new Date().toISOString(),
      },
    };

    expect(partyAttendanceSummary(party, guests)).toBe("1 of 2 attending");
  });
});
