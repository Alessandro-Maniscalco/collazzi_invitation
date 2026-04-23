import Link from "next/link";

import { getDashboardSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function HostLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const snapshot = await getDashboardSnapshot();
  const message =
    params.sent === "1"
      ? "Magic link sent. Check your inbox."
      : params.error === "1"
        ? "That email does not have host access."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-[2rem] bg-stone-950 px-8 py-10 text-white shadow-[0_30px_80px_rgba(27,18,11,0.28)]">
          <div className="section-label text-[var(--app-gold)]">Host Login</div>
          <h1 className="mt-5 font-display text-5xl leading-none">
            Private dashboard access for you and your sister.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-stone-300">
            In mock mode this page signs in one of the seeded host accounts directly. If Supabase
            keys are configured, the same form sends a magic link instead.
          </p>
          <div className="mt-8 grid gap-3">
            {snapshot.hosts.map((host) => (
              <div
                key={host.id}
                className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4"
              >
                <div className="font-semibold">{host.name}</div>
                <div className="text-sm text-stone-300">{host.email}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] border border-[var(--app-line)] p-8">
          <div className="section-label">Sign In</div>
          <h2 className="mt-4 font-display text-4xl text-stone-950">Open the host shell</h2>
          {message ? (
            <div className="mt-5 rounded-2xl border border-[var(--app-line)] bg-white/80 px-4 py-3 text-sm text-stone-700">
              {message}
            </div>
          ) : null}
          <form action="/api/host/login" method="post" className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">Email</span>
              <input
                type="email"
                name="email"
                required
                placeholder={snapshot.hosts[0]?.email}
                className="w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--app-wine)]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex rounded-full bg-[var(--app-wine)] px-5 py-3 text-sm font-semibold text-white"
            >
              Continue
            </button>
          </form>
          <Link href="/" className="mt-6 inline-flex text-sm text-stone-600 underline underline-offset-4">
            Back to previews
          </Link>
        </section>
      </div>
    </main>
  );
}
