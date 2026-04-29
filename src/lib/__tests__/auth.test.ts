import { afterEach, describe, expect, it, vi } from "vitest";

import { cookies } from "next/headers";

import { getDashboardSnapshot } from "@/lib/repository";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/repository", () => ({
  getDashboardSnapshot: vi.fn(),
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

  it("does not load dashboard data when no host cookie exists", async () => {
    vi.stubEnv("HOST_PASSWORD", "test-host-password");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(() => undefined),
    } as never);

    const { getHostSession } = await import("@/lib/auth");

    await expect(getHostSession()).resolves.toBeNull();
    expect(getDashboardSnapshot).not.toHaveBeenCalled();
  });
});
