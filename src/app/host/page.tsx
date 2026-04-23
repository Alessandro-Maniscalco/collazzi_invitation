import { HostDashboard } from "@/components/host/host-dashboard";
import { requireHostSession } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function HostPage() {
  const host = await requireHostSession();
  const snapshot = await getDashboardSnapshot();

  return <HostDashboard initialData={snapshot} host={host} />;
}
