import React, { type AnchorHTMLAttributes, type ReactNode } from "react";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HostDashboard } from "@/components/host/host-dashboard";
import { createSeedState } from "@/lib/seed-data";
import type { DashboardSnapshot } from "@/lib/types";

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean | null;
  children?: ReactNode;
};

vi.mock("next/link", () => ({
  default: ({ href, prefetch, children, ...props }: MockLinkProps) =>
    React.createElement(
      "a",
      { ...props, href, "data-prefetch": String(prefetch) },
      children,
    ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.stubGlobal("React", React);

afterEach(() => cleanup());

function dashboardSnapshot(): DashboardSnapshot {
  const state = createSeedState();
  const parties = state.parties.map((party) => ({
    ...party,
    guests: state.guests.filter((guest) => guest.partyId === party.id),
    deliveries: state.deliveries.filter((delivery) => delivery.partyId === party.id),
  }));

  return {
    event: state.event,
    hosts: state.hosts,
    questions: state.questions,
    itinerary: state.itinerary,
    accommodations: state.accommodations,
    parties,
    stats: {
      invitedParties: parties.length,
      deliveredMessages: 0,
      openedInvites: 0,
      attendingGuests: 0,
      declinedGuests: 0,
      pendingParties: parties.length,
    },
    activities: state.activities,
  };
}

describe("HostDashboard", () => {
  it("does not render private invitation opener links", () => {
    const snapshot = dashboardSnapshot();

    render(React.createElement(HostDashboard, {
      initialData: snapshot,
    }));

    expect(screen.queryByRole("link", { name: "Open link" })).not.toBeInTheDocument();
    expect(screen.queryByText("Host Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add invited party" })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Copy the private invitation link for/ }),
    ).toHaveLength(snapshot.parties.length);
  });

  it("shows the generated display name and allows a manual override", () => {
    const snapshot = dashboardSnapshot();

    render(React.createElement(HostDashboard, {
      initialData: snapshot,
    }));

    const displayName = screen.getByLabelText("Display name");

    fireEvent.change(screen.getByLabelText("Primary first name"), {
      target: { value: "Giulia" },
    });
    fireEvent.change(screen.getByLabelText("Primary last name"), {
      target: { value: "Rossi" },
    });
    expect(displayName).toHaveValue("Giulia Rossi");

    fireEvent.change(screen.getByLabelText("Second guest first name"), {
      target: { value: "Marco" },
    });
    fireEvent.change(screen.getByLabelText("Second guest last name"), {
      target: { value: "Rossi" },
    });
    expect(displayName).toHaveValue("Giulia e Marco Rossi");

    fireEvent.change(displayName, { target: { value: "Giulia & Marco" } });
    fireEvent.change(screen.getByLabelText("Second guest first name"), {
      target: { value: "Marcello" },
    });
    expect(displayName).toHaveValue("Giulia e Marcello Rossi");
  });

  it("does not submit the add-guest form when Enter is pressed in a field", () => {
    const snapshot = dashboardSnapshot();

    render(React.createElement(HostDashboard, {
      initialData: snapshot,
    }));

    expect(
      fireEvent.keyDown(screen.getByLabelText("Primary first name"), { key: "Enter" }),
    ).toBe(false);
  });

  it("shows RSVP receipt and link open status separately from latest email delivery", () => {
    const snapshot = dashboardSnapshot();
    const party = snapshot.parties[0];
    const openedAt = new Date(Date.now() - 120_000).toISOString();
    const rsvpUpdatedAt = new Date(Date.now() - 60_000).toISOString();

    party.token.openedAt = openedAt;
    party.response = {
      status: "not_attending",
      guestSelections: Object.fromEntries(party.guests.map((guest) => [guest.id, false])),
      answers: {
        question_walking_dinner: false,
        question_party: false,
        question_transfer: false,
      },
      note: "Grazie",
      updatedAt: rsvpUpdatedAt,
    };
    party.deliveries = [
      {
        id: "delivery_preview",
        partyId: party.id,
        channel: "email",
        kind: "invite",
        recipient: party.email ?? "",
        subjectLine: "Invitation",
        bodyPreview: "Open your invitation",
        status: "sent",
        sentAt: new Date(Date.now() - 180_000).toISOString(),
        openedAt,
        sandbox: false,
      },
    ];

    render(React.createElement(HostDashboard, {
      initialData: snapshot,
    }));

    expect(screen.getByText(/RSVP received .* · Not attending/)).toBeInTheDocument();
    expect(screen.getByText(/Opened link /)).toBeInTheDocument();
    expect(screen.getByText("EMAIL invite sent")).toBeInTheDocument();
  });
});
