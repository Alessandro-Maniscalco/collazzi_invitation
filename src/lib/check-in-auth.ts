import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/env";

export const CHECKIN_COOKIE_NAME = "collazzi-check-in";
const SESSION_SUBJECT = "staff";

export function hasCheckInConfig() {
  return Boolean(env.CHECKIN_PIN && env.CHECKIN_SESSION_SECRET);
}

export function verifyCheckInPin(pin: string) {
  return safeEqual(pin, env.CHECKIN_PIN ?? "");
}

export function createCheckInSessionValue() {
  if (!env.CHECKIN_SESSION_SECRET) {
    throw new Error("Check-in session secret is not configured.");
  }
  return `${SESSION_SUBJECT}.${sign(SESSION_SUBJECT)}`;
}

export function parseCheckInSessionValue(value: string | undefined) {
  if (!value || !env.CHECKIN_SESSION_SECRET) return false;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return false;

  const subject = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  return subject === SESSION_SUBJECT && safeEqual(signature, sign(subject));
}

export async function hasCheckInSession() {
  const cookieStore = await cookies();
  return parseCheckInSessionValue(cookieStore.get(CHECKIN_COOKIE_NAME)?.value);
}

function sign(subject: string) {
  return createHmac("sha256", env.CHECKIN_SESSION_SECRET ?? "")
    .update(subject)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const submitted = Buffer.from(left);
  const expected = Buffer.from(right);
  return submitted.length === expected.length && timingSafeEqual(submitted, expected);
}
