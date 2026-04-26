import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  HOST_COOKIE_NAME,
  createHostSessionValue,
  hasHostPasswordConfig,
  verifyHostPassword,
} from "@/lib/auth";
import { env, isLocalAppUrl } from "@/lib/env";
import { recordHostLogin } from "@/lib/repository";
import { SEED_HOSTS } from "@/lib/seed-data";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const host = SEED_HOSTS[0];

  if (!hasHostPasswordConfig()) {
    return NextResponse.redirect(new URL("/host/login?error=config", env.APP_URL));
  }

  if (!host || !verifyHostPassword(password)) {
    return NextResponse.redirect(new URL("/host/login?error=1", env.APP_URL));
  }

  const cookieStore = await cookies();
  cookieStore.set(HOST_COOKIE_NAME, createHostSessionValue(host.id), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: !isLocalAppUrl(),
    path: "/",
  });

  await recordHostLogin(host.email).catch(() => undefined);
  return NextResponse.redirect(new URL("/host", env.APP_URL));
}
