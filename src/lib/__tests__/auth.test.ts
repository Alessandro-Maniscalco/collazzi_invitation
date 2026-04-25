import { afterEach, describe, expect, it, vi } from "vitest";

describe("host auth helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("signs host session cookies and rejects tampered values", async () => {
    vi.stubEnv("HOST_PASSWORD", "test-host-password");
    const { createHostSessionValue, parseHostSessionValue } = await import("@/lib/auth");

    const value = createHostSessionValue("host_bona_ale");

    expect(parseHostSessionValue(value)).toBe("host_bona_ale");
    expect(parseHostSessionValue(value.replace("host_bona_ale", "host_other"))).toBeNull();
    expect(parseHostSessionValue("host_bona_ale")).toBeNull();
  });
});
