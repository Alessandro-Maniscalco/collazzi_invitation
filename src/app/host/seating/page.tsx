import type { Metadata } from "next";

import { SeatingPlanner } from "@/components/host/seating-planner";
import { requireHostSession } from "@/lib/auth";
import { getSeatingSnapshot } from "@/lib/seating-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seating Plan",
  robots: { index: false, follow: false },
};

export default async function SeatingPage() {
  await requireHostSession();
  const seating = await getSeatingSnapshot();

  return <SeatingPlanner initialData={seating} />;
}
