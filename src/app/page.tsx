import Link from "next/link";

import { SEED_HOST_EMAILS } from "@/lib/seed-data";
import { previewSeedLinks } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const links = await previewSeedLinks();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(200,180,141,0.26),_transparent_40%),_var(--app-cream)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="paper-panel rounded-[2rem] border border-[var(--app-line)] px-8 py-12">
          <div className="section-label">Guest Preview</div>
          <h1 className="mt-4 font-display text-5xl leading-none text-stone-950 sm:text-6xl">
            Open the invitation exactly as a guest would see it.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
            Choose a seeded guest link below to preview the invitation. The host dashboard stays
            separate.
          </p>
        </header>

        <section className="grid gap-5">
          {links.map((link) => (
            <Link
              key={link.token}
              href={`/i/${link.token}`}
              className="group paper-panel rounded-[1.8rem] border border-[var(--app-line)] px-6 py-6 transition hover:-translate-y-0.5 hover:border-[var(--app-wine)]"
            >
              <div className="section-label">Preview Guest</div>
              <div className="mt-3 font-display text-4xl text-stone-950">{link.label}</div>
              <div className="mt-2 text-sm text-stone-600">/i/{link.token}</div>
            </Link>
          ))}
        </section>

        <section className="rounded-[2rem] border border-stone-900/10 bg-stone-950 px-8 py-10 text-[var(--app-cream)] shadow-[0_24px_60px_rgba(27,18,11,0.22)]">
          <div className="section-label text-[var(--app-gold)]">Host Access</div>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            In local mock mode, sign in with one of the seeded host emails below.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-stone-100">
            {SEED_HOST_EMAILS.map((email) => (
              <li key={email} className="rounded-xl border border-white/10 px-4 py-3">
                {email}
              </li>
            ))}
          </ul>
          <Link
            href="/host/login"
            className="mt-6 inline-flex rounded-full bg-[var(--app-gold)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-[#d9c59d]"
          >
            Open Host Dashboard
          </Link>
        </section>
      </div>
    </main>
  );
}
