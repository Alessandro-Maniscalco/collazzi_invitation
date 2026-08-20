import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckInScreen } from "@/components/check-in/check-in-screen";
import { hasCheckInSession } from "@/lib/check-in-auth";
import { getCheckInGuests } from "@/lib/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guest Check-In",
  robots: { index: false, follow: false },
};

export default async function CheckInPage() {
  if (!(await hasCheckInSession())) redirect("/check-in/login");
  return <CheckInScreen initialGuests={await getCheckInGuests()} />;
}
