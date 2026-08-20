import { afterEach, describe, expect, it, vi } from "vitest";

import { cookies } from "next/headers";
import { SEED_HOSTS } from "@/lib/seed-data";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

describe("host auth helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
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

  it("returns no host when no host cookie exists", async () => {
    vi.stubEnv("HOST_PASSWORD", "test-host-password");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(() => undefined),
    } as never);

    const { getHostSession } = await import("@/lib/auth");

    await expect(getHostSession()).resolves.toBeNull();
  });

  it("validates a signed host session without loading guest data", async () => {
    vi.stubEnv("HOST_PASSWORD", "test-host-password");
    const { createHostSessionValue, getHostSession } = await import("@/lib/auth");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(() => ({ value: createHostSessionValue(SEED_HOSTS[0].id) })),
    } as never);

    await expect(getHostSession()).resolves.toEqual(SEED_HOSTS[0]);
  });
});
