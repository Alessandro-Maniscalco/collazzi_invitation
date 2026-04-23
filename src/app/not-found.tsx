import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="paper-panel max-w-xl rounded-[2rem] border border-[var(--app-line)] p-10 text-center">
        <div className="section-label">Invitation Unavailable</div>
        <h1 className="mt-4 font-display text-5xl text-stone-950">That private link is no longer valid.</h1>
        <p className="mt-4 text-stone-600">
          The invitation may have expired, been regenerated, or never existed in this workspace.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-[var(--app-wine)] px-5 py-3 text-sm font-semibold text-white"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
