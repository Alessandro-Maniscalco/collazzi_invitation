import React from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CheckInScreen } from "@/components/check-in/check-in-screen";
import type { CheckInGuest } from "@/lib/types";

beforeEach(() => vi.stubGlobal("React", React));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const guests: CheckInGuest[] = [
  {
    partyId: "party_rossi",
    member: "guest_1",
    name: "Mario Rossi",
    checkedIn: false,
    tableName: "Olive",
  },
  {
    partyId: "party_bianchi",
    member: "guest_1",
    name: "Luca Bianchi",
    checkedIn: true,
  },
];

describe("CheckInScreen", () => {
  it("shows a table only when assigned and clears/refocuses after a check-in", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ guest: guests[0] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ guests: [{ ...guests[0], checkedIn: true }, guests[1]] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckInScreen initialGuests={guests} />);
    const input = screen.getByPlaceholderText("First name or last name");
    fireEvent.change(input, { target: { value: "ross mario" } });

    expect(screen.getByText("Table: Olive")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check in Mario Rossi" }));

    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    await waitFor(() => expect(screen.getByText("Mario Rossi is present.")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/check-in/guests",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ partyId: "party_rossi", member: "guest_1", checkedIn: true }),
      }),
    );

    fireEvent.change(input, { target: { value: "Bianchi" } });
    expect(screen.queryByText(/^Table:/)).not.toBeInTheDocument();
  });

  it("sends an explicit false state when removing an existing check-in", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ guest: guests[1] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ guests }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<CheckInScreen initialGuests={guests} />);
    const input = screen.getByPlaceholderText("First name or last name");
    fireEvent.change(input, { target: { value: "Luca" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove check-in for Luca Bianchi" }));

    expect(input).toHaveValue("");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      partyId: "party_bianchi",
      member: "guest_1",
      checkedIn: false,
    });
  });
});
