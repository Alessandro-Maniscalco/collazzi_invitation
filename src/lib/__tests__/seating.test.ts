import { describe, expect, it } from "vitest";

import {
  applySeatingMove,
  seatingCheckInSummaryFromSheet,
  seatingGuestsFromSheet,
  seatingUpdatesForGuest,
  sortSeatingGuests,
} from "@/lib/seating";
import type { SheetGuest } from "@/lib/sheets/guest-sheet";

function sheetGuest(overrides: Partial<SheetGuest> = {}): SheetGuest {
  return {
    rowNumber: 2,
    guestId: "party-1",
    token: "token",
    tokenActive: true,
    tokenActiveExplicit: true,
    inviteUrl: "https://example.com/i/token",
    lastName: "Rossi",
    firstName: "Alessandra",
    guest2LastName: "Bianchi",
    guest2FirstName: "Beatrice",
    invitedByAle: false,
    invitedByBona: false,
    invitedByMum: false,
    counted: true,
    source: "Diana",
    sentWhatsappSaveTheDate: false,
    sentInstagramSaveTheDate: false,
    willInviteToWalkingDinner: false,
    sentInviteMarked: false,
    comingToWalkingDinner: false,
    comingToParty: true,
    guest2ComingToParty: true,
    transferNeeded: false,
    notComing: false,
    rsvpNote: "",
    primaryCheckedIn: false,
    guest2CheckedIn: true,
    primaryTableName: "Table 3",
    guest2TableName: "4",
    primarySeatPosition: 2,
    guest2SeatPosition: 7,
    hasResponse: true,
    ...overrides,
  };
}

describe("seating plan", () => {
  it("uses only Diana guests and keeps first and last names separate", () => {
    const guests = seatingGuestsFromSheet([
      sheetGuest(),
      sheetGuest({ guestId: "other", source: "Ale" }),
    ]);

    expect(guests).toEqual([
      expect.objectContaining({
        id: "party-1:guest_1",
        firstName: "Alessandra",
        lastName: "Rossi",
        tableId: 3,
        seatPosition: 2,
        checkedIn: false,
      }),
      expect.objectContaining({
        id: "party-1:guest_2",
        firstName: "Beatrice",
        lastName: "Bianchi",
        tableId: 4,
        seatPosition: 7,
        checkedIn: true,
      }),
    ]);
  });

  it("includes only individually attending Diana guests", () => {
    const guests = seatingGuestsFromSheet([
      sheetGuest({ comingToParty: false, guest2ComingToParty: true }),
      sheetGuest({
        guestId: "primary-only",
        comingToParty: true,
        guest2ComingToParty: false,
      }),
      sheetGuest({
        guestId: "nobody-coming",
        comingToParty: false,
        guest2ComingToParty: false,
      }),
    ]);

    expect(guests.map((guest) => guest.id)).toEqual([
      "party-1:guest_2",
      "primary-only:guest_1",
    ]);
  });

  it("splits check-in counts into Diana adults and everyone else", () => {
    expect(
      seatingCheckInSummaryFromSheet([
        sheetGuest(),
        sheetGuest({
          guestId: "other",
          source: "Ale",
          guest2FirstName: "",
          guest2LastName: "",
          primaryCheckedIn: true,
        }),
      ]),
    ).toEqual({
      adults: { checkedIn: 1, total: 2 },
      others: { checkedIn: 1, total: 1 },
    });
  });

  it("sorts the unseated list by last name and then first name", () => {
    const guests = seatingGuestsFromSheet([
      sheetGuest({ guestId: "rossi-z", firstName: "Zoe", lastName: "Rossi" }),
      sheetGuest({ guestId: "bianchi-b", firstName: "Beatrice", lastName: "Bianchi" }),
      sheetGuest({ guestId: "bianchi-a", firstName: "Alessandra", lastName: "Bianchi" }),
    ]).filter((guest) => guest.member === "guest_1");

    expect(sortSeatingGuests(guests).map((guest) => guest.id)).toEqual([
      "bianchi-a:guest_1",
      "bianchi-b:guest_1",
      "rossi-z:guest_1",
    ]);
  });

  it("moves into an empty seat immediately", () => {
    const guests = seatingGuestsFromSheet([sheetGuest()]);
    const moved = applySeatingMove(guests, {
      guestId: "party-1:guest_1",
      targetTableId: 8,
      targetSeatPosition: 10,
      mode: "move",
    });

    expect(moved[0]).toMatchObject({ tableId: 8, seatPosition: 10 });
  });

  it("switches two occupied seats", () => {
    const guests = seatingGuestsFromSheet([sheetGuest()]);
    const moved = applySeatingMove(guests, {
      guestId: "party-1:guest_1",
      targetTableId: 4,
      targetSeatPosition: 7,
      mode: "switch",
    });

    expect(moved.find((guest) => guest.member === "guest_1")).toMatchObject({
      tableId: 4,
      seatPosition: 7,
    });
    expect(moved.find((guest) => guest.member === "guest_2")).toMatchObject({
      tableId: 3,
      seatPosition: 2,
    });
  });

  it("drops the displaced guest back into the alphabetical source list", () => {
    const guests = seatingGuestsFromSheet([sheetGuest()]);
    const moved = applySeatingMove(guests, {
      guestId: "party-1:guest_1",
      targetTableId: 4,
      targetSeatPosition: 7,
      mode: "drop",
    });

    expect(moved.find((guest) => guest.member === "guest_2")).toMatchObject({
      tableId: undefined,
      seatPosition: undefined,
    });
  });

  it("writes the exact guest-specific table and seat columns", () => {
    const source = sheetGuest();
    const guest = seatingGuestsFromSheet([source])[1];

    expect(seatingUpdatesForGuest(source, { ...guest, tableId: 12, seatPosition: 5 })).toEqual({
      rowNumber: 2,
      updates: [
        { header: "Tavoli guest 2", value: "12" },
        { header: "Position guest 2", value: "5" },
      ],
    });
  });
});
