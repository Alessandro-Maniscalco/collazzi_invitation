import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { getDashboardSnapshot } from "@/lib/repository";
import type { HostUser } from "@/lib/types";

export const HOST_COOKIE_NAME = "collazzi-host";
const SESSION_SEPARATOR = ".";

export async function getHostSession() {
  const snapshot = await getDashboardSnapshot();
  const cookieStore = await cookies();
  const hostId = parseHostSessionValue(cookieStore.get(HOST_COOKIE_NAME)?.value);

  if (hostId) {
    return snapshot.hosts.find((host) => host.id === hostId) ?? null;
  }

  return null;
}

export async function requireHostSession() {
  const session = await getHostSession();
  if (!session) {
    redirect("/host/login");
  }
  return session;
}

export function isOwner(host: HostUser) {
  return host.role === "owner";
}

export function hasHostPasswordConfig() {
  return Boolean(env.HOST_PASSWORD);
}

export function verifyHostPassword(password: string) {
  if (!env.HOST_PASSWORD) {
    return false;
  }

  const submitted = Buffer.from(password);
  const expected = Buffer.from(env.HOST_PASSWORD);

  return submitted.length === expected.length && timingSafeEqual(submitted, expected);
}

export function createHostSessionValue(hostId: string) {
  if (!env.HOST_PASSWORD) {
    throw new Error("HOST_PASSWORD is required to create a host session.");
  }

  return `${hostId}${SESSION_SEPARATOR}${signHostSession(hostId)}`;
}

export function parseHostSessionValue(value: string | undefined) {
  if (!value || !env.HOST_PASSWORD) {
    return null;
  }

  const separatorIndex = value.lastIndexOf(SESSION_SEPARATOR);
  if (separatorIndex <= 0) {
    return null;
  }

  const hostId = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const expected = signHostSession(hostId);
  const submitted = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (submitted.length !== expectedBuffer.length) {
    return null;
  }

  return timingSafeEqual(submitted, expectedBuffer) ? hostId : null;
}

function signHostSession(hostId: string) {
  return createHmac("sha256", env.HOST_PASSWORD ?? "").update(hostId).digest("base64url");
}
