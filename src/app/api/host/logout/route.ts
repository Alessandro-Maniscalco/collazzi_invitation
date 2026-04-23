import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { HOST_COOKIE_NAME } from "@/lib/auth";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(HOST_COOKIE_NAME);

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/host/login", env.APP_URL));
}
