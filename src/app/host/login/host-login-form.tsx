"use client";

import type { KeyboardEvent } from "react";

export function HostLoginForm({ message }: { message: string | null }) {
  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <>
      {message ? (
        <div className="mt-5 rounded-2xl border border-[var(--app-line)] bg-white/80 px-4 py-3 text-sm text-stone-700">
          {message}
        </div>
      ) : null}
      <form action="/api/host/login" method="post" className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-stone-700">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            enterKeyHint="go"
            onKeyDown={submitOnEnter}
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
    </>
  );
}
