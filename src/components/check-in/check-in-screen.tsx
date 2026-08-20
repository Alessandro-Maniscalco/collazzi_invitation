"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { searchCheckInGuests } from "@/lib/check-in";
import type { CheckInGuest } from "@/lib/types";

const REFRESH_INTERVAL_MS = 10_000;

export function CheckInScreen({ initialGuests }: { initialGuests: CheckInGuest[] }) {
  const [guests, setGuests] = useState(initialGuests);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mutationInFlight = useRef(false);

  const results = useMemo(() => searchCheckInGuests(guests, query).slice(0, 30), [guests, query]);

  const refreshGuests = useCallback(async () => {
    if (mutationInFlight.current) return;
    const response = await fetch("/api/check-in/guests", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { guests: CheckInGuest[] };
    setGuests(payload.guests);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(refreshGuests, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refreshGuests]);

  async function setCheckIn(guest: CheckInGuest) {
    const checkedIn = !guest.checkedIn;
    mutationInFlight.current = true;
    setError(null);
    setMessage(null);
    setGuests((current) =>
      current.map((candidate) =>
        candidate.partyId === guest.partyId && candidate.member === guest.member
          ? { ...candidate, checkedIn }
          : candidate,
      ),
    );
    setQuery("");
    inputRef.current?.focus({ preventScroll: true });

    const response = await fetch("/api/check-in/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partyId: guest.partyId,
        member: guest.member,
        checkedIn,
      }),
    });

    if (response.ok) {
      setMessage(checkedIn ? `${guest.name} is present.` : `Removed check-in for ${guest.name}.`);
    } else {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(`${guest.name}: ${payload?.error ?? "Unable to update check-in."}`);
    }

    mutationInFlight.current = false;
    await refreshGuests();
  }

  return (
    <main className="min-h-dvh px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-5 px-1">
          <div className="section-label">Live Guest List</div>
          <h1 className="mt-3 font-display text-5xl leading-none text-stone-950 sm:text-6xl">Check-in</h1>
        </header>

        <section className="paper-panel sticky top-3 z-10 rounded-[1.75rem] border border-[var(--app-line)] p-4 shadow-[0_18px_45px_rgba(46,32,20,0.12)] sm:p-5">
          <label htmlFor="guest-search" className="sr-only">Search guest name</label>
          <input
            ref={inputRef}
            id="guest-search"
            type="search"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="search"
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setMessage(null);
              setError(null);
            }}
            placeholder="First name or last name"
            className="w-full rounded-2xl border border-stone-300 bg-white px-5 py-4 text-lg outline-none transition placeholder:text-stone-400 focus:border-[var(--app-wine)] focus:ring-4 focus:ring-[rgba(90,31,45,0.1)]"
          />
        </section>

        <div aria-live="polite" className="mt-4">
          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              {message}
            </div>
          ) : null}
          {error ? (
            <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
              {error}
            </div>
          ) : null}
        </div>

        <section className="mt-4 space-y-3" aria-label="Guest search results">
          {query.trim() && results.length === 0 ? (
            <div className="rounded-2xl border border-[var(--app-line)] bg-white/70 px-5 py-6 text-center text-sm text-stone-600">
              No guest found. Try the first name, last name, or both.
            </div>
          ) : null}

          {results.map((guest) => (
            <button
              key={`${guest.partyId}:${guest.member}`}
              type="button"
              onClick={() => setCheckIn(guest)}
              aria-label={`${guest.checkedIn ? "Remove check-in for" : "Check in"} ${guest.name}`}
              className={`w-full rounded-[1.5rem] border px-5 py-5 text-left shadow-sm transition active:scale-[0.99] ${
                guest.checkedIn
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-[var(--app-line)] bg-white hover:border-stone-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-stone-950">{guest.name}</div>
                  {guest.tableName ? (
                    <div className="mt-1 text-sm font-semibold text-[var(--app-wine)]">
                      Table: {guest.tableName}
                    </div>
                  ) : null}
                </div>
                <div className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  guest.checkedIn ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-700"
                }`}>
                  {guest.checkedIn ? "Present ✓" : "Mark present"}
                </div>
              </div>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
