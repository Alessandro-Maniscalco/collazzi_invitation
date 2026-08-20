import { describe, expect, it } from "vitest";

import {
  shouldImplyPartyAttendance,
  visibleRsvpQuestions,
} from "@/components/invitation/rsvp-modal";
import type { Question } from "@/lib/types";

const walkingDinnerQuestions = [
  {
    id: "question_walking_dinner",
    label: "Dinner in the centre of Florence - Thursday, August 27th, 19h30",
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
  it("shows Florence dinner, party, and transfer for dinner invitees", () => {
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
