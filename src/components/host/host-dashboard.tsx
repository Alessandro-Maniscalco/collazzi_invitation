"use client";

import { startTransition, useDeferredValue, useMemo, useState, type FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  deliveryStatusTone,
  formatDeadline,
  formatRelative,
  latestDelivery,
  partyAttendanceSummary,
} from "@/lib/formatters";
import type { DashboardSnapshot, HostUser, Party } from "@/lib/types";

const emptyNewGuestForm = {
  last_name: "",
  first_name: "",
  email: "",
  guest_2_last_name: "",
  guest_2_first_name: "",
  display_name: "",
  invited_by_ale: false,
  invited_by_bona: false,
  invited_by_mum: false,
  source: "",
  will_invite_to_walking_dinner: false,
  sent_whatsapp_save_the_date: false,
  sent_instagram_save_the_date: false,
};

type NewGuestForm = typeof emptyNewGuestForm;

function freshNewGuestForm(): NewGuestForm {
  return { ...emptyNewGuestForm };
}

export function HostDashboard({
  initialData,
  host,
}: {
  initialData: DashboardSnapshot;
  host: HostUser;
}) {
  const router = useRouter();
  const [csvText, setCsvText] = useState(
    "label,email,guests,tags,notes\nJamie & Riley,preview-new@example.com,Jamie Lang;Riley Lang,friends;dinner,Imported sample row",
  );
  const [newGuest, setNewGuest] = useState<NewGuestForm>(() => freshNewGuestForm());
  const [status, setStatus] = useState<string | null>(null);
  const [addingGuest, setAddingGuest] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [reminderFilter, setReminderFilter] = useState<
    "awaiting_response" | "attending" | "not_attending" | "all"
  >("awaiting_response");

  const deferredCsv = useDeferredValue(csvText);
  const previewCount = useMemo(() => {
    const lines = deferredCsv.trim().split("\n").filter(Boolean);
    return Math.max(lines.length - 1, 0);
  }, [deferredCsv]);

  async function importCsv() {
    const response = await fetch("/api/host/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ csv: csvText }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ?? "Could not import CSV.");
      return;
    }

    setStatus("Imported guest rows.");
    startTransition(() => router.refresh());
  }

  async function addInvitedPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddingGuest(true);
    setStatus(null);

    const response = await fetch("/api/host/guests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newGuest),
    });

    setAddingGuest(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ?? "Could not add guest.");
      return;
    }

    const addedLabel =
      newGuest.display_name ||
      (newGuest.guest_2_first_name || newGuest.guest_2_last_name
        ? `${newGuest.first_name} e ${newGuest.guest_2_first_name || newGuest.guest_2_last_name} ${
            newGuest.last_name
          }`.trim()
        : `${newGuest.first_name} ${newGuest.last_name}`.trim());
    setStatus(`Added ${addedLabel}.`);
    setNewGuest(freshNewGuestForm());
    startTransition(() => router.refresh());
  }

  function updateNewGuest<K extends keyof NewGuestForm>(field: K, value: NewGuestForm[K]) {
    setNewGuest((current) => ({ ...current, [field]: value }));
  }

  async function sendRequest(path: "/api/send" | "/api/reminders", body: Record<string, unknown>, success: string) {
    setSending(path);
    setStatus(null);
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    setSending(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ?? "Unable to send.");
      return;
    }

    setStatus(success);
    startTransition(() => router.refresh());
  }

  async function regenerateToken(partyId: string) {
    const response = await fetch("/api/host/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ partyId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ?? "Unable to regenerate token.");
      return;
    }

    setStatus("Regenerated guest link.");
    startTransition(() => router.refresh());
  }

  const stats = initialData.stats;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(200,180,141,0.18),_transparent_30%),_var(--app-cream)] px-6 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="overflow-hidden rounded-[2rem] bg-stone-950 px-8 py-8 text-white shadow-[0_30px_80px_rgba(27,18,11,0.28)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="section-label text-[var(--app-gold)]">Host Dashboard</div>
              <h1 className="mt-4 font-display text-5xl">{initialData.event.summaryName}</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-stone-300">
                Signed in as {host.email} ({host.role}). In local development this dashboard uses a
                file-backed mock store; the same schema is modeled in Drizzle for Supabase/Postgres.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white"
              >
                Home
              </Link>
              <form action="/api/host/logout" method="post">
                <button
                  type="submit"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </header>

        {status ? (
          <div className="rounded-[1.5rem] border border-[var(--app-line)] bg-white px-5 py-4 text-sm text-stone-700">
            {status}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            ["Invited parties", stats.invitedParties],
            ["Messages", stats.deliveredMessages],
            ["Opened", stats.openedInvites],
            ["Attending guests", stats.attendingGuests],
            ["Declined guests", stats.declinedGuests],
            ["Pending parties", stats.pendingParties],
          ].map(([label, value]) => (
            <div
              key={label}
              className="paper-panel rounded-[1.6rem] border border-[var(--app-line)] p-5"
            >
              <div className="section-label">{label}</div>
              <div className="mt-4 font-display text-5xl text-stone-950">{value}</div>
            </div>
          ))}
        </section>

        <section className="paper-panel rounded-[2rem] border border-[var(--app-line)] p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="section-label">Delivery</div>
              <h2 className="mt-4 font-display text-4xl text-stone-950">Send invitations and reminders</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                Email delivery runs in sandbox mode until Resend environment variables are configured.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  sendRequest(
                    "/api/send",
                    { channels: ["email"], filter: "all" },
                    "Sent invitation batch.",
                  )
                }
                disabled={Boolean(sending)}
                className="rounded-full bg-[var(--app-wine)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending === "/api/send" ? "Sending..." : "Send all email invitations"}
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={reminderFilter}
                  onChange={(event) =>
                    setReminderFilter(
                      event.target.value as "awaiting_response" | "attending" | "not_attending" | "all",
                    )
                  }
                  className="rounded-full border border-[var(--app-line)] bg-white px-4 py-3 text-sm"
                >
                  <option value="awaiting_response">Awaiting response</option>
                  <option value="attending">Attending</option>
                  <option value="not_attending">Not attending</option>
                  <option value="all">All guests</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    sendRequest(
                      "/api/reminders",
                      { channels: ["email"], filter: reminderFilter },
                      "Queued reminder batch.",
                    )
                  }
                  disabled={Boolean(sending)}
                  className="rounded-full border border-[var(--app-line)] bg-white px-5 py-3 text-sm font-semibold text-stone-800 disabled:opacity-50"
                >
                  Email reminders
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="paper-panel rounded-[2rem] border border-[var(--app-line)] p-8">
              <div className="section-label">Add Guest</div>
              <h2 className="mt-4 font-display text-4xl text-stone-950">Add invited party</h2>
              <form onSubmit={addInvitedPerson} className="mt-6 grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-stone-700">
                      Primary last name
                    </span>
                    <input
                      required
                      value={newGuest.last_name}
                      onChange={(event) => updateNewGuest("last_name", event.target.value)}
                      className="w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-stone-700">
                      Primary first name
                    </span>
                    <input
                      required
                      value={newGuest.first_name}
                      onChange={(event) => updateNewGuest("first_name", event.target.value)}
                      className="w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-stone-700">Email</span>
                  <input
                    type="email"
                    value={newGuest.email}
                    onChange={(event) => updateNewGuest("email", event.target.value)}
                    className="w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3"
                  />
                </label>
                <div className="section-label">Second Guest</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-stone-700">
                      Second guest first name
                    </span>
                    <input
                      value={newGuest.guest_2_first_name}
                      onChange={(event) => updateNewGuest("guest_2_first_name", event.target.value)}
                      className="w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-stone-700">
                      Second guest last name
                    </span>
                    <input
                      value={newGuest.guest_2_last_name}
                      onChange={(event) => updateNewGuest("guest_2_last_name", event.target.value)}
                      className="w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    Display name
                  </span>
                  <input
                    value={newGuest.display_name}
                    onChange={(event) => updateNewGuest("display_name", event.target.value)}
                    placeholder="Auto-generated when blank"
                    className="w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-stone-700">
                    Source
                  </span>
                  <input
                    value={newGuest.source}
                    onChange={(event) => updateNewGuest("source", event.target.value)}
                    placeholder="Examples: AleAI, Bona list, Mum table, Instagram DM"
                    className="w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3"
                  />
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={newGuest.will_invite_to_walking_dinner}
                    onChange={(event) =>
                      updateNewGuest("will_invite_to_walking_dinner", event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Will invite to walking dinner
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-3 text-sm font-semibold text-stone-700">Invited by</div>
                    <div className="grid gap-3">
                      {[
                        ["invited_by_ale", "Ale"],
                        ["invited_by_bona", "Bona"],
                        ["invited_by_mum", "Mum"],
                      ].map(([field, label]) => (
                        <label key={field} className="flex items-center gap-3 text-sm text-stone-700">
                          <input
                            type="checkbox"
                            checked={Boolean(newGuest[field as keyof NewGuestForm])}
                            onChange={(event) =>
                              updateNewGuest(
                                field as "invited_by_ale" | "invited_by_bona" | "invited_by_mum",
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 text-sm font-semibold text-stone-700">Save the date sent</div>
                    <div className="grid gap-3">
                      {[
                        ["sent_whatsapp_save_the_date", "WhatsApp"],
                        ["sent_instagram_save_the_date", "Instagram"],
                      ].map(([field, label]) => (
                        <label key={field} className="flex items-center gap-3 text-sm text-stone-700">
                          <input
                            type="checkbox"
                            checked={Boolean(newGuest[field as keyof NewGuestForm])}
                            onChange={(event) =>
                              updateNewGuest(
                                field as
                                  | "sent_whatsapp_save_the_date"
                                  | "sent_instagram_save_the_date",
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={addingGuest}
                  className="w-fit rounded-full bg-[var(--app-wine)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {addingGuest ? "Adding..." : "Add invited party"}
                </button>
              </form>
            </div>

            <div className="paper-panel rounded-[2rem] border border-[var(--app-line)] p-8">
              <div className="section-label">Import Guests</div>
              <h2 className="mt-4 font-display text-4xl text-stone-950">CSV guest intake</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                Expected columns: label,email,guests,tags,notes. Use semicolons inside guests
                and tags.
              </p>
              <textarea
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                rows={8}
                className="mt-5 w-full rounded-[1.5rem] border border-[var(--app-line)] bg-white px-4 py-4 font-mono text-sm"
              />
              <div className="mt-4 text-sm text-stone-600">
                Preview rows detected: <span className="font-semibold text-stone-900">{previewCount}</span>
              </div>
              <button
                type="button"
                onClick={importCsv}
                className="mt-5 rounded-full border border-[var(--app-line)] bg-white px-5 py-3 text-sm font-semibold text-stone-900"
              >
                Import CSV
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="paper-panel rounded-[2rem] border border-[var(--app-line)] p-8">
              <div className="section-label">Guest List</div>
              <div className="mt-5 space-y-4">
                {initialData.parties.map((party) => {
                  const latest = latestDelivery(party.deliveries);
                  return (
                    <div
                      key={party.id}
                      className="rounded-[1.5rem] border border-[var(--app-line)] bg-white/80 p-5"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold text-stone-950">{party.label}</div>
                            <div className="mt-1 text-sm text-stone-600">
                              {party.guests.map((guest) => guest.name).join(", ")}
                            </div>
                            <div className="mt-2 text-sm text-stone-600">
                              {partyAttendanceSummary(party as Party, party.guests)}
                            </div>
                          </div>
                          <div className="text-right text-sm text-stone-600">
                            <div>{party.email ?? "No email"}</div>
                            <div className="mt-2">Last sent {formatRelative(party.lastSentAt)}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <Link
                            href={`/i/${party.token.value}`}
                            className="rounded-full border border-[var(--app-line)] px-4 py-2 font-semibold"
                          >
                            Open link
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              sendRequest(
                                "/api/send",
                                { partyIds: [party.id], channels: ["email"] },
                                `Sent email invite for ${party.label}.`,
                              )
                            }
                            className="rounded-full border border-[var(--app-line)] px-4 py-2 font-semibold"
                          >
                            Email
                          </button>
                          <button
                            type="button"
                            onClick={() => regenerateToken(party.id)}
                            className="rounded-full border border-[var(--app-line)] px-4 py-2 font-semibold"
                          >
                            Regenerate link
                          </button>
                        </div>
                        {latest ? (
                          <div className="text-sm">
                            <span className={`font-semibold ${deliveryStatusTone(latest.status)}`}>
                              {latest.channel.toUpperCase()} {latest.kind} {latest.status}
                            </span>
                            <span className="ml-2 text-stone-600">{formatRelative(latest.sentAt)}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-stone-500">No deliveries yet.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="paper-panel rounded-[2rem] border border-[var(--app-line)] p-8">
              <div className="section-label">Recent Activity</div>
              <div className="mt-5 space-y-4">
                {initialData.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/80 px-4 py-4"
                  >
                    <div className="text-sm font-semibold text-stone-900">{activity.message}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.24em] text-stone-500">
                      {activity.actor} · {formatRelative(activity.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-sm text-stone-600">
                RSVP deadline: {formatDeadline(initialData.event.rsvpDeadline)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
