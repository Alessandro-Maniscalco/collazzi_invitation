import React, { type ComponentPropsWithoutRef } from "react";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSeedState } from "@/lib/seed-data";
import type { InvitationView, PartyResponse } from "@/lib/types";

type MockImageProps = ComponentPropsWithoutRef<"img"> & {
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
};

vi.mock("next/image", () => ({
  default: ({ fill, priority, unoptimized, alt = "", ...props }: MockImageProps) => {
    void fill;
    void priority;
    void unoptimized;

    return React.createElement("img", { ...props, alt });
  },
}));

vi.stubGlobal("React", React);

afterEach(() => cleanup());

function previewInvitation(response?: PartyResponse): InvitationView {
  const state = createSeedState();
  const party = state.parties[0];

  return {
    event: state.event,
    party: { ...party, response },
    guests: state.guests.filter((guest) => guest.partyId === party.id),
    questions: state.questions,
    itinerary: state.itinerary,
    accommodations: state.accommodations,
    deliveries: [],
  };
}

describe("InvitationExperience", () => {
  it("renders the sheet guest label as the Paperless Post recipient line", async () => {
    const { InvitationExperience } = await import(
      "@/components/invitation/invitation-experience"
    );

    render(React.createElement(InvitationExperience, { invitation: previewInvitation() }));

    expect(screen.getByTestId("recipient-to-name")).toHaveTextContent(
      "To: Taylor & Jordan Russo",
    );
  });

  it("shows a saved RSVP confirmation and changes the action to Update", async () => {
    const { InvitationExperience } = await import(
      "@/components/invitation/invitation-experience"
    );
    const response: PartyResponse = {
      status: "attending",
      guestSelections: {},
      answers: {},
      note: "",
      updatedAt: "2026-07-27T12:00:00.000Z",
    };

    render(
      React.createElement(InvitationExperience, {
        invitation: previewInvitation(response),
      }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "RSVP confirmed — You will attend.",
    );
    expect(screen.queryByRole("button", { name: "Will attend" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Will not attend" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Update" }),
    ).toBeInTheDocument();
  });
});
