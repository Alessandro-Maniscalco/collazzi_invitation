import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { HOST_COOKIE_NAME } from "@/lib/auth";
import { env } from "@/lib/env";
import { getDashboardSnapshot, recordHostLogin } from "@/lib/repository";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const snapshot = await getDashboardSnapshot();
  const host = snapshot.hosts.find((candidate) => candidate.email.toLowerCase() === email);

  if (!host) {
    return NextResponse.redirect(new URL("/host/login?error=1", env.APP_URL));
  }

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${env.APP_URL.replace(/\/$/, "")}/host/auth/callback`,
      },
    });

    return NextResponse.redirect(new URL("/host/login?sent=1", env.APP_URL));
  }

  const cookieStore = await cookies();
  cookieStore.set(HOST_COOKIE_NAME, host.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  await recordHostLogin(host.email);
  return NextResponse.redirect(new URL("/host", env.APP_URL));
}
