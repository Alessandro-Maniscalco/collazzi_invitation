import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { hasCheckInSession } from "@/lib/check-in-auth";

import { CheckInLoginForm } from "./check-in-login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff Check-In",
  robots: { index: false, follow: false },
};

export default async function CheckInLoginPage() {
  if (await hasCheckInSession()) redirect("/check-in");

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <section className="paper-panel w-full max-w-md rounded-[2rem] border border-[var(--app-line)] p-7 sm:p-9">
        <div className="section-label">Private Staff Access</div>
        <h1 className="mt-4 font-display text-5xl leading-none text-stone-950">Guest check-in</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">
          Enter the staff PIN to search the live guest list.
        </p>
        <CheckInLoginForm />
      </section>
    </main>
  );
}
