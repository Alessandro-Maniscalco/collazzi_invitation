import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { recordHostLogin } from "@/lib/repository";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectUrl = new URL("/host/login", env.APP_URL);

  const supabase = await createSupabaseServerClient();
  if (!supabase || !code) {
    return NextResponse.redirect(redirectUrl);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(redirectUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    await recordHostLogin(user.email);
  }

  return NextResponse.redirect(new URL("/host", env.APP_URL));
}
