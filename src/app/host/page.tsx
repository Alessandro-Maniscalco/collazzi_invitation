import { redirect } from "next/navigation";

import { HostDashboard } from "@/components/host/host-dashboard";
import { findHostById, requireHostSessionId } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function HostPage() {
  const hostId = await requireHostSessionId();
  const snapshot = await getDashboardSnapshot();
  const host = findHostById(snapshot, hostId);

  if (!host) {
    redirect("/host/login");
  }

  return <HostDashboard initialData={snapshot} host={host} />;
}
