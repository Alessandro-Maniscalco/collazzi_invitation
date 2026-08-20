import { afterEach, describe, expect, it, vi } from "vitest";

import { hasCheckInSession } from "@/lib/check-in-auth";
import {
  CheckInGuestUnavailableError,
  getCheckInGuests,
  updateCheckIn,
} from "@/lib/repository";

import { GET, PATCH } from "./route";

vi.mock("@/lib/check-in-auth", () => ({ hasCheckInSession: vi.fn() }));
vi.mock("@/lib/repository", () => ({
  CheckInGuestUnavailableError: class CheckInGuestUnavailableError extends Error {},
  getCheckInGuests: vi.fn(),
  updateCheckIn: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

describe("check-in guest API", () => {
  it("rejects unauthenticated reads before loading guest data", async () => {
    vi.mocked(hasCheckInSession).mockResolvedValue(false);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getCheckInGuests).not.toHaveBeenCalled();
  });

  it("rejects malformed member identifiers", async () => {
    vi.mocked(hasCheckInSession).mockResolvedValue(true);
    const request = new Request("http://localhost/api/check-in/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partyId: "party_1", member: "guest_3", checkedIn: true }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    expect(updateCheckIn).not.toHaveBeenCalled();
  });

  it("passes the intended boolean state to the repository", async () => {
    vi.mocked(hasCheckInSession).mockResolvedValue(true);
    vi.mocked(updateCheckIn).mockResolvedValue({
      partyId: "party_1",
      member: "guest_2",
      name: "Anna Rossi",
      checkedIn: true,
    });
    const request = new Request("http://localhost/api/check-in/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partyId: "party_1", member: "guest_2", checkedIn: true }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    expect(updateCheckIn).toHaveBeenCalledWith("party_1", "guest_2", true);
  });

  it("returns a conflict when a stale result was removed from the Sheet", async () => {
    vi.mocked(hasCheckInSession).mockResolvedValue(true);
    vi.mocked(updateCheckIn).mockRejectedValue(new CheckInGuestUnavailableError());
    const request = new Request("http://localhost/api/check-in/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partyId: "removed_party", member: "guest_1", checkedIn: true }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(409);
  });
});
