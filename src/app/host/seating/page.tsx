import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SeatingPlanner } from "@/components/host/seating-planner";
import { findHostById, requireHostSessionId } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/repository";
import { getSeatingSnapshot } from "@/lib/seating-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seating Plan",
  robots: { index: false, follow: false },
};

export default async function SeatingPage() {
  const hostId = await requireHostSessionId();
  const [dashboard, seating] = await Promise.all([
    getDashboardSnapshot(),
    getSeatingSnapshot(),
  ]);

  if (!findHostById(dashboard, hostId)) redirect("/host/login");

  return <SeatingPlanner initialData={seating} />;
}
