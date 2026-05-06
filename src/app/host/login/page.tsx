import { HostLoginForm } from "./host-login-form";

export const dynamic = "force-dynamic";

export default async function HostLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const message =
    params.error === "config"
      ? "Host password is not configured."
      : params.error === "1"
        ? "The password is incorrect."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-[2rem] bg-stone-950 px-8 py-10 text-white shadow-[0_30px_80px_rgba(27,18,11,0.28)]">
          <div className="section-label text-[var(--app-gold)]">Host Login</div>
          <h1 className="mt-5 font-display text-5xl leading-none">
            Private dashboard access.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-stone-300">
            Sign in with the host password to manage guest links, invitations, and RSVP responses.
          </p>
        </section>

        <section className="paper-panel rounded-[2rem] border border-[var(--app-line)] p-8">
          <div className="section-label">Sign In</div>
          <h2 className="mt-4 font-display text-4xl text-stone-950">Open the host shell</h2>
          <HostLoginForm message={message} />
        </section>
      </div>
    </main>
  );
}
