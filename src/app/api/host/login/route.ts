import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  HOST_COOKIE_NAME,
  createHostSessionValue,
  hasHostPasswordConfig,
  verifyHostPassword,
} from "@/lib/auth";
import { recordHostLogin } from "@/lib/repository";
import { SEED_HOSTS } from "@/lib/seed-data";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const host = SEED_HOSTS[0];

  if (!hasHostPasswordConfig()) {
    return NextResponse.redirect(new URL("/host/login?error=config", origin));
  }

  if (!host || !verifyHostPassword(password)) {
    return NextResponse.redirect(new URL("/host/login?error=1", origin));
  }

  const cookieStore = await cookies();
  cookieStore.set(HOST_COOKIE_NAME, createHostSessionValue(host.id), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
  });

  await recordHostLogin(host.email).catch(() => undefined);
  return NextResponse.redirect(new URL("/host", origin));
}
