import { describe, expect, it } from "vitest";

import {
  isValidRsvpEmail,
  normalizeRsvpEmail,
  shouldRequireEmailForRsvp,
  shouldImplyPartyAttendance,
  visibleRsvpQuestions,
} from "@/components/invitation/rsvp-modal";
import type { Question } from "@/lib/types";

const walkingDinnerQuestions = [
  {
    id: "question_walking_dinner",
    label: "Walking dinner - Thursday, August 27th, 19h30",
    type: "checkbox",
  },
  {
    id: "question_party",
    label: "The Party - Friday, August 28th, 19h30",
    type: "checkbox",
  },
  {
    id: "question_transfer",
    label: "Transfer needed for the party",
    type: "checkbox",
  },
] satisfies Question[];

describe("RSVP question visibility", () => {
  it("shows walking dinner, party, and transfer for walking dinner invitees", () => {
    const implyParty = shouldImplyPartyAttendance(walkingDinnerQuestions);

    expect(implyParty).toBe(false);
    expect(visibleRsvpQuestions(walkingDinnerQuestions, implyParty).map((question) => question.id))
      .toEqual(["question_walking_dinner", "question_party", "question_transfer"]);
  });

  it("keeps party implied for party-only invitees", () => {
    const partyOnlyQuestions = walkingDinnerQuestions.filter(
      (question) => question.id !== "question_walking_dinner",
    );
    const implyParty = shouldImplyPartyAttendance(partyOnlyQuestions);

    expect(implyParty).toBe(true);
    expect(visibleRsvpQuestions(partyOnlyQuestions, implyParty).map((question) => question.id))
      .toEqual(["question_transfer"]);
  });
});

describe("RSVP email requirement", () => {
  it("requires an email only for attending RSVPs when the party has no email", () => {
    expect(shouldRequireEmailForRsvp("attending", undefined)).toBe(true);
    expect(shouldRequireEmailForRsvp("attending", "")).toBe(true);
    expect(shouldRequireEmailForRsvp("attending", "guest@example.com")).toBe(false);
    expect(shouldRequireEmailForRsvp("not_attending", undefined)).toBe(false);
  });

  it("normalizes and validates RSVP emails", () => {
    expect(normalizeRsvpEmail(" Guest@Example.COM ")).toBe("guest@example.com");
    expect(isValidRsvpEmail("guest@example.com")).toBe(true);
    expect(isValidRsvpEmail("guest")).toBe(false);
  });
});
