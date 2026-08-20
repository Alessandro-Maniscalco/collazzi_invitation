"use client";

import { useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

export function CheckInLoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/check-in/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to sign in.");
      return;
    }

    router.replace("/check-in");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-stone-700">Staff PIN</span>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          enterKeyHint="go"
          autoFocus
          required
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="w-full rounded-2xl border border-[var(--app-line)] bg-white px-5 py-4 text-center text-2xl tracking-[0.45em] outline-none transition focus:border-[var(--app-wine)] focus:ring-4 focus:ring-[rgba(90,31,45,0.1)]"
        />
      </label>
      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-[var(--app-wine)] px-5 py-4 text-base font-semibold text-white shadow-[0_12px_26px_rgba(90,31,45,0.2)] disabled:opacity-60"
      >
        {submitting ? "Opening…" : "Open check-in"}
      </button>
    </form>
  );
}
