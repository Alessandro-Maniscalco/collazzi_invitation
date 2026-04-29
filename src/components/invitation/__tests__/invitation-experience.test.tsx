import React, { type ComponentPropsWithoutRef } from "react";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSeedState } from "@/lib/seed-data";
import type { InvitationView } from "@/lib/types";

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

function previewInvitation(): InvitationView {
  const state = createSeedState();
  const party = state.parties[0];

  return {
    event: state.event,
    party,
    guests: state.guests.filter((guest) => guest.partyId === party.id),
    questions: state.questions,
    itinerary: state.itinerary,
    accommodations: state.accommodations,
    deliveries: [],
    readOnly: true,
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
});
