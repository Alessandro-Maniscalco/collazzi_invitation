import { describe, expect, it } from "vitest";

import {
  buildRsvpColumnUpdates,
  buildInviteUrlFormula,
  findGuestSheetIntegrityErrors,
  GUEST_SHEET_HEADERS,
  labelForSheetGuest,
  NEW_GUEST_RSVP_DEFAULTS,
  parseGuestSheet,
  sheetGuestResponse,
  sheetGuestMembers,
} from "@/lib/sheets/guest-sheet";

function rowFromRecord(record: Record<string, string>) {
  return GUEST_SHEET_HEADERS.map((header) => record[header] ?? "");
}

describe("parseGuestSheet", () => {
  it("builds invite URL formulas from the token cell", () => {
    expect(buildInviteUrlFormula("https://example.com/", "Q", 12)).toBe(
      '=IF(Q12="","", "https://example.com/i/"&Q12)',
    );
  });

  it("keeps editable guest columns first and leaves guest phone out of the app schema", () => {
    expect(GUEST_SHEET_HEADERS.slice(0, 15)).toEqual([
      "last_name",
      "first_name",
      "email",
      "guest_2_last_name",
      "guest_2_first_name",
      "display_name",
      "invited_by_ale",
      "invited_by_bona",
      "invited_by_mum",
      "counted",
      "source",
      "will_invite_to_walking_dinner",
      "sent_whatsapp_save_the_date",
      "sent_instagram_save_the_date",
      "spazio",
    ]);
    expect(GUEST_SHEET_HEADERS).not.toContain("phone");
  });

  it("normalizes the current legacy headings and positional RSVP columns", () => {
    const table = parseGuestSheet(
      [
        ["", "", "", "", "", "", "746"],
        [
          "Last Name",
          "Name",
          "Email",
          "",
          "",
          "",
          "",
          "Source",
          "",
          "",
          "Spazio",
          "",
          "",
          "",
          "",
          "",
        ],
        [
          "Ambrogi",
          "Marcello",
          "marcello@example.com",
          "TRUE",
          "FALSE",
          "TRUE",
          "1",
          "AleAI",
          "TRUE",
          "FALSE",
          "",
          "FALSE",
          "TRUE",
          "FALSE",
          "TRUE",
          "FALSE",
        ],
      ],
      "http://localhost:3000",
    );

    expect(table.headerRowIndex).toBe(1);
    expect(table.nextAppendRowNumber).toBe(4);
    expect(table.needsHeaderUpdate).toBe(true);
    expect(table.headers.slice(0, 16)).toEqual([
      "last_name",
      "first_name",
      "email",
      "invited_by_ale",
      "invited_by_bona",
      "invited_by_mum",
      "counted",
      "source",
      "sent_whatsapp_save_the_date",
      "sent_instagram_save_the_date",
      "spazio",
      "sent_invite_at",
      "coming_to_walking_dinner",
      "coming_to_party",
      "transfer_needed",
      "not_coming",
    ]);
    expect(table.guests[0]).toMatchObject({
      firstName: "Marcello",
      lastName: "Ambrogi",
      email: "marcello@example.com",
      invitedByAle: true,
      invitedByMum: true,
      counted: true,
      source: "AleAI",
      comingToWalkingDinner: true,
      comingToParty: false,
      transferNeeded: true,
      notComing: false,
      sentInviteAt: undefined,
      sentInviteMarked: false,
      hasResponse: true,
    });
  });

  it("chooses the next explicit append row below the live guest data", () => {
    const table = parseGuestSheet(
      [
        ["", "", "", 403, 358, 123, 0, "", "Inviti Inviati"],
        ["", "", "", "", "", "", "", "", 414],
        [...GUEST_SHEET_HEADERS],
        rowFromRecord({
          first_name: "Existing",
          last_name: "Guest",
          email: "existing@example.com",
        }),
      ],
      "http://localhost:3000",
    );

    expect(table.headerRowIndex).toBe(2);
    expect(table.nextAppendRowNumber).toBe(5);
  });

  it("maps normalized RSVP fields to the app response shape", () => {
    const table = parseGuestSheet(
      [
        [...GUEST_SHEET_HEADERS],
        rowFromRecord({
          guest_id: "guest_1",
          token: "guest_token",
          token_active: "TRUE",
          invite_url: "http://localhost:3000/i/guest_token",
          first_name: "Dev",
          last_name: "Karpe",
          will_invite_to_walking_dinner: "TRUE",
          coming_to_walking_dinner: "TRUE",
          coming_to_party: "TRUE",
          transfer_needed: "FALSE",
          not_coming: "FALSE",
          rsvp_note: "See you there",
          rsvp_updated_at: "2026-04-25T12:00:00.000Z",
        }),
      ],
      "http://localhost:3000",
    );

    expect(sheetGuestResponse(table.guests[0])).toEqual({
      status: "attending",
      guestSelections: { guest_1: true },
      answers: {
        question_walking_dinner: true,
        question_party: true,
        question_transfer: false,
      },
      note: "See you there",
      updatedAt: "2026-04-25T12:00:00.000Z",
    });
  });

  it("keeps two invited guests on one row with separate RSVP selections", () => {
    const table = parseGuestSheet(
      [
        [...GUEST_SHEET_HEADERS],
        rowFromRecord({
          guest_id: "guest_signori",
          token: "guest_token",
          token_active: "TRUE",
          first_name: "Monica",
          last_name: "Signori",
          email: "monica@example.com",
          guest_2_first_name: "Saverio",
          guest_2_last_name: "Signori",
          coming_to_party: "TRUE",
          guest_2_coming_to_party: "FALSE",
          not_coming: "FALSE",
          rsvp_updated_at: "2026-04-25T12:00:00.000Z",
        }),
      ],
      "http://localhost:3000",
    );

    const guest = table.guests[0];

    expect(labelForSheetGuest(guest)).toBe("Monica e Saverio Signori");
    expect(sheetGuestMembers(guest)).toEqual([
      {
        id: "guest_signori",
        partyId: "guest_signori",
        name: "Monica Signori",
        firstName: "Monica",
        lastName: "Signori",
        primary: true,
      },
      {
        id: "guest_signori__guest_2",
        partyId: "guest_signori",
        name: "Saverio Signori",
        firstName: "Saverio",
        lastName: "Signori",
        primary: false,
      },
    ]);
    expect(sheetGuestResponse(guest)).toMatchObject({
      status: "attending",
      guestSelections: {
        guest_signori: true,
        guest_signori__guest_2: false,
      },
      answers: {
        question_party: true,
      },
    });
  });

  it("keeps explicitly inactive tokens inactive", () => {
    const table = parseGuestSheet(
      [
        [...GUEST_SHEET_HEADERS],
        rowFromRecord({
          guest_id: "guest_1",
          token: "guest_token",
          token_active: "FALSE",
          first_name: "Dev",
          last_name: "Karpe",
        }),
      ],
      "http://localhost:3000",
    );

    expect(table.guests[0]).toMatchObject({
      tokenActive: false,
      tokenActiveExplicit: true,
    });
  });

  it("parses the walking dinner invite checkbox", () => {
    const table = parseGuestSheet(
      [
        [...GUEST_SHEET_HEADERS],
        rowFromRecord({
          guest_id: "guest_1",
          token: "guest_token",
          first_name: "Dev",
          last_name: "Karpe",
          will_invite_to_walking_dinner: "TRUE",
        }),
      ],
      "http://localhost:3000",
    );

    expect(table.guests[0].willInviteToWalkingDinner).toBe(true);
  });

  it("keeps explicit new guest RSVP defaults pending", () => {
    expect(NEW_GUEST_RSVP_DEFAULTS).toEqual({
      coming_to_walking_dinner: "FALSE",
      coming_to_party: "FALSE",
      guest_2_coming_to_party: "FALSE",
      transfer_needed: "FALSE",
      not_coming: "FALSE",
    });

    const table = parseGuestSheet(
      [
        [...GUEST_SHEET_HEADERS],
        rowFromRecord({
          ...NEW_GUEST_RSVP_DEFAULTS,
          guest_id: "guest_1",
          token: "guest_token",
          first_name: "Dev",
          last_name: "Karpe",
          will_invite_to_walking_dinner: "TRUE",
        }),
      ],
      "http://localhost:3000",
    );

    expect(table.guests[0]).toMatchObject({
      willInviteToWalkingDinner: true,
      comingToWalkingDinner: false,
      comingToParty: false,
      guest2ComingToParty: false,
      transferNeeded: false,
      notComing: false,
      hasResponse: false,
    });
    expect(sheetGuestResponse(table.guests[0])).toBeUndefined();
  });

  it("excludes rows marked not invited with counted 0", () => {
    const table = parseGuestSheet(
      [
        [...GUEST_SHEET_HEADERS],
        rowFromRecord({
          first_name: "Zero",
          last_name: "Counted",
          email: "zero@example.com",
          counted: "0",
        }),
      ],
      "http://localhost:3000",
    );

    expect(table.guests).toHaveLength(0);
  });

  it("keeps rows with a blank counted value active", () => {
    const table = parseGuestSheet(
      [
        [...GUEST_SHEET_HEADERS],
        rowFromRecord({
          first_name: "Blank",
          last_name: "Counted",
          email: "blank@example.com",
        }),
      ],
      "http://localhost:3000",
    );

    expect(table.guests).toHaveLength(1);
    expect(table.guests[0]).toMatchObject({
      firstName: "Blank",
      lastName: "Counted",
      email: "blank@example.com",
      counted: true,
    });
  });

  it("reports duplicate guest ids and tokens before live sheet mutation", () => {
    const table = parseGuestSheet(
      [
        [...GUEST_SHEET_HEADERS],
        rowFromRecord({
          guest_id: "guest_1",
          token: "duplicate_token",
          first_name: "One",
        }),
        rowFromRecord({
          guest_id: "guest_1",
          token: "duplicate_token",
          first_name: "Two",
        }),
      ],
      "http://localhost:3000",
    );

    expect(findGuestSheetIntegrityErrors(table.guests)).toEqual([
      { field: "guest_id", value: "guest_1", rows: [2, 3] },
      { field: "token", value: "duplicate_token", rows: [2, 3] },
    ]);
  });
});

describe("buildRsvpColumnUpdates", () => {
  it("only writes RSVP-owned columns and clears event attendance when declining", () => {
    const updates = buildRsvpColumnUpdates(
      {
        token: "guest_token",
        selections: { guest_1: false },
        answers: {
          question_walking_dinner: true,
          question_party: true,
          question_transfer: true,
        },
        note: "Sorry",
      },
      "2026-04-25T12:00:00.000Z",
    );

    expect(updates).toEqual([
      { header: "coming_to_walking_dinner", value: "FALSE" },
      { header: "coming_to_party", value: "FALSE" },
      { header: "transfer_needed", value: "FALSE" },
      { header: "not_coming", value: "TRUE" },
      { header: "rsvp_note", value: "Sorry" },
      { header: "rsvp_updated_at", value: "2026-04-25T12:00:00.000Z" },
      { header: "last_error", value: "" },
    ]);
  });

  it("writes primary and second guest party attendance separately", () => {
    const updates = buildRsvpColumnUpdates(
      {
        token: "guest_token",
        selections: { guest_1: true, guest_1__guest_2: false },
        answers: {
          question_walking_dinner: true,
          question_party: true,
          question_transfer: false,
        },
        note: "",
      },
      "2026-04-25T12:00:00.000Z",
      {
        primaryGuestId: "guest_1",
        guest2Id: "guest_1__guest_2",
      },
    );

    expect(updates).toEqual([
      { header: "coming_to_walking_dinner", value: "TRUE" },
      { header: "coming_to_party", value: "TRUE" },
      { header: "guest_2_coming_to_party", value: "FALSE" },
      { header: "transfer_needed", value: "FALSE" },
      { header: "not_coming", value: "FALSE" },
      { header: "rsvp_note", value: "" },
      { header: "rsvp_updated_at", value: "2026-04-25T12:00:00.000Z" },
      { header: "last_error", value: "" },
    ]);
  });

  it("respects an explicit party checkbox for walking dinner invitees", () => {
    const updates = buildRsvpColumnUpdates(
      {
        token: "guest_token",
        selections: { guest_1: true },
        answers: {
          question_walking_dinner: true,
          question_party: false,
          question_transfer: true,
        },
        note: "Dinner only",
      },
      "2026-04-25T12:00:00.000Z",
      {
        primaryGuestId: "guest_1",
      },
    );

    expect(updates).toEqual([
      { header: "coming_to_walking_dinner", value: "TRUE" },
      { header: "coming_to_party", value: "FALSE" },
      { header: "transfer_needed", value: "TRUE" },
      { header: "not_coming", value: "FALSE" },
      { header: "rsvp_note", value: "Dinner only" },
      { header: "rsvp_updated_at", value: "2026-04-25T12:00:00.000Z" },
      { header: "last_error", value: "" },
    ]);
  });
});
