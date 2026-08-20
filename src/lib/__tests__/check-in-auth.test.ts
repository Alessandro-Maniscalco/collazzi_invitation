import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

describe("check-in auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("verifies the staff PIN and rejects a different value", async () => {
    vi.stubEnv("CHECKIN_PIN", "246810");
    vi.stubEnv("CHECKIN_SESSION_SECRET", "test-secret-that-is-not-the-pin");
    const { verifyCheckInPin } = await import("@/lib/check-in-auth");

    expect(verifyCheckInPin("246810")).toBe(true);
    expect(verifyCheckInPin("246811")).toBe(false);
  });

  it("signs session cookies with the separate secret and rejects tampering", async () => {
    vi.stubEnv("CHECKIN_PIN", "246810");
    vi.stubEnv("CHECKIN_SESSION_SECRET", "test-secret-that-is-not-the-pin");
    const { createCheckInSessionValue, parseCheckInSessionValue } = await import(
      "@/lib/check-in-auth"
    );

    const value = createCheckInSessionValue();
    expect(parseCheckInSessionValue(value)).toBe(true);
    expect(parseCheckInSessionValue(value.replace("staff", "other"))).toBe(false);
  });
});
