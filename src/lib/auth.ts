import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase";
import { getDashboardSnapshot } from "@/lib/repository";
import type { HostUser } from "@/lib/types";

export const HOST_COOKIE_NAME = "collazzi-host";

export async function getHostSession() {
  const snapshot = await getDashboardSnapshot();
  const cookieStore = await cookies();
  const mockHostId = cookieStore.get(HOST_COOKIE_NAME)?.value;

  if (mockHostId) {
    return snapshot.hosts.find((host) => host.id === mockHostId) ?? null;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return snapshot.hosts.find((host) => host.email === user.email) ?? null;
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
