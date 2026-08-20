"use client";

import {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  cn,
  deliveryStatusTone,
  formatDeadline,
  formatRelative,
  latestDelivery,
  partyAttendanceSummary,
} from "@/lib/formatters";
import type { DashboardSnapshot, DeliveryStatus, Party } from "@/lib/types";

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
type InviteComingToPartyFilter = "all" | "yes" | "no";
type InviteDeliveryStatusFilter = "any" | "none" | DeliveryStatus;

const COMING_TO_PARTY_OPTIONS: Array<{ value: InviteComingToPartyFilter; label: string }> = [
  { value: "all", label: "Any" },
  { value: "yes", label: "TRUE" },
  { value: "no", label: "FALSE" },
];

const DELIVERY_STATUS_OPTIONS: Array<{ value: InviteDeliveryStatusFilter; label: string }> = [
  { value: "any", label: "Any" },
  { value: "none", label: "Blank" },
  { value: "sandbox", label: "Sandbox" },
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "opened", label: "Opened" },
  { value: "failed", label: "Failed" },
];

const SYSTEM_PARTY_TAGS = new Set([
  "invited_by_ale",
  "invited_by_bona",
  "invited_by_mum",
  "walking_dinner_invited",
  "sent_whatsapp_save_the_date",
  "sent_instagram_save_the_date",
  "counted",
]);

const buttonBaseClass =
  "inline-flex cursor-pointer items-center justify-center rounded-full font-semibold transition duration-150 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-wine)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none";

const primaryButtonClass = cn(
  buttonBaseClass,
  "bg-[var(--app-wine)] text-white shadow-[0_12px_26px_rgba(102,0,51,0.2)] hover:-translate-y-0.5 hover:bg-[#7a1245] hover:shadow-[0_16px_30px_rgba(102,0,51,0.25)]",
);

const secondaryButtonClass = cn(
  buttonBaseClass,
  "border border-[var(--app-line)] bg-white text-stone-800 hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-50 hover:shadow-sm",
);

function freshNewGuestForm(): NewGuestForm {
  return { ...emptyNewGuestForm };
}

function labelForNewGuestName(firstName: string, lastName: string, email = "") {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || email.trim() || "Guest";
}

function generatedDisplayName(guest: NewGuestForm) {
  const primaryLabel = labelForNewGuestName(guest.first_name, guest.last_name, guest.email);
  const hasSecondGuest = Boolean(guest.guest_2_first_name.trim() || guest.guest_2_last_name.trim());

  if (!hasSecondGuest) {
    return primaryLabel;
  }

  const guest2Label = labelForNewGuestName(guest.guest_2_first_name, guest.guest_2_last_name);
  const sharedLastName =
    guest.last_name.trim() &&
    guest.guest_2_last_name.trim() &&
    guest.last_name.trim().toLocaleLowerCase() ===
      guest.guest_2_last_name.trim().toLocaleLowerCase();

  if (sharedLastName && guest.first_name.trim() && guest.guest_2_first_name.trim()) {
    return `${guest.first_name.trim()} e ${guest.guest_2_first_name.trim()} ${guest.last_name.trim()}`;
  }

  return `${primaryLabel} e ${guest2Label}`;
}

function updatesGeneratedDisplayName(field: keyof NewGuestForm) {
  return field === "email";
}

function resetsGeneratedDisplayName(field: keyof NewGuestForm) {
  return (
    field === "last_name" ||
    field === "first_name" ||
    field === "guest_2_last_name" ||
    field === "guest_2_first_name"
  );
}

function sourceForParty(party: DashboardSnapshot["parties"][number]) {
  if (party.source?.trim()) {
    return party.source.trim();
  }

  return party.tags.find((tag) => !SYSTEM_PARTY_TAGS.has(tag))?.trim() ?? "";
}

function normalizeSource(source: string) {
  return source.trim().toLocaleLowerCase();
}

function toggleButtonClass(active: boolean, className?: string) {
  return cn(
    buttonBaseClass,
    "border px-4 py-2 text-sm",
    active
      ? "border-[var(--app-wine)] bg-[var(--app-wine)] text-white shadow-[0_8px_20px_rgba(102,0,51,0.18)] hover:-translate-y-0.5 hover:bg-[#7a1245] hover:shadow-[0_12px_24px_rgba(102,0,51,0.2)]"
      : "border-[var(--app-line)] bg-white text-stone-800 hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-50 hover:shadow-sm",
    className,
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Copy command failed.");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

function partyComingToParty(party: DashboardSnapshot["parties"][number]) {
  return Boolean(party.response && Object.values(party.response.guestSelections).some(Boolean));
}

function partyMatchesInviteFilters(
  party: DashboardSnapshot["parties"][number],
  comingToParty: InviteComingToPartyFilter,
  lastDeliveryStatus: InviteDeliveryStatusFilter,
) {
  if (comingToParty !== "all") {
    const matchesComingToParty = partyComingToParty(party);
    if (matchesComingToParty !== (comingToParty === "yes")) {
      return false;
    }
  }

  if (lastDeliveryStatus !== "any") {
    const status = latestDelivery(party.deliveries)?.status;
    if (lastDeliveryStatus === "none") {
      return !status;
    }

    return status === lastDeliveryStatus;
  }

  return true;
}

function inviteBody(body: Record<string, unknown>) {
  return {
    last_delivery_status: "none",
    ...body,
  };
}

function selectedSourcesLabel(sources: string[]) {
  if (sources.length === 1) {
    return sources[0];
  }

  return `${sources.length} sources`;
}

export function HostDashboard({
  initialData,
}: {
  initialData: DashboardSnapshot;
}) {
  const router = useRouter();
  const [csvText, setCsvText] = useState(
    "label,email,guests,tags,notes\nJamie & Riley,preview-new@example.com,Jamie Lang;Riley Lang,friends;dinner,Imported sample row",
  );
  const [newGuest, setNewGuest] = useState<NewGuestForm>(() => freshNewGuestForm());
  const [displayNameManuallyEdited, setDisplayNameManuallyEdited] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [addingGuest, setAddingGuest] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [reminderFilter, setReminderFilter] = useState<
    "awaiting_response" | "attending" | "not_attending" | "all"
  >("awaiting_response");
  const [inviteSources, setInviteSources] = useState<string[]>([]);
  const [showInviteFilters, setShowInviteFilters] = useState(false);
  const [inviteComingToParty, setInviteComingToParty] =
    useState<InviteComingToPartyFilter>("all");
  const [inviteLastDeliveryStatus, setInviteLastDeliveryStatus] =
    useState<InviteDeliveryStatusFilter>("any");
  const [copiedLinkPartyId, setCopiedLinkPartyId] = useState<string | null>(null);

  const deferredCsv = useDeferredValue(csvText);
  const previewCount = useMemo(() => {
    const lines = deferredCsv.trim().split("\n").filter(Boolean);
    return Math.max(lines.length - 1, 0);
  }, [deferredCsv]);
  const sourceOptions = useMemo(
    () =>
      Array.from(
        new Set(initialData.parties.map(sourceForParty).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right)),
    [initialData.parties],
  );
  const selectedSourceSet = useMemo(
    () => new Set(inviteSources.map(normalizeSource)),
    [inviteSources],
  );
  const selectedSourceCount = inviteSources.length
    ? initialData.parties.filter(
        (party) =>
          selectedSourceSet.has(normalizeSource(sourceForParty(party))) &&
          partyMatchesInviteFilters(party, inviteComingToParty, inviteLastDeliveryStatus),
      ).length
    : 0;
  const inviteFiltersActive =
    inviteComingToParty !== "all" || inviteLastDeliveryStatus !== "any";

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

    const addedLabel = newGuest.display_name.trim() || generatedDisplayName(newGuest);
    setStatus(`Added ${addedLabel}.`);
    setNewGuest(freshNewGuestForm());
    setDisplayNameManuallyEdited(false);
    startTransition(() => router.refresh());
  }

  function updateNewGuest<K extends keyof NewGuestForm>(field: K, value: NewGuestForm[K]) {
    const shouldResetDisplayName = resetsGeneratedDisplayName(field);

    if (shouldResetDisplayName) {
      setDisplayNameManuallyEdited(false);
    }

    setNewGuest((current) => {
      const next = { ...current, [field]: value };

      if (
        shouldResetDisplayName ||
        (!displayNameManuallyEdited && updatesGeneratedDisplayName(field))
      ) {
        next.display_name = generatedDisplayName(next);
      }

      return next;
    });
  }

  function updateDisplayName(value: string) {
    const hasManualDisplayName = value.trim().length > 0;
    setDisplayNameManuallyEdited(hasManualDisplayName);
    setNewGuest((current) => ({
      ...current,
      display_name: hasManualDisplayName ? value : generatedDisplayName(current),
    }));
  }

  function toggleInviteSource(source: string) {
    setInviteSources((current) => {
      const normalized = normalizeSource(source);
      if (current.some((value) => normalizeSource(value) === normalized)) {
        return current.filter((value) => normalizeSource(value) !== normalized);
      }

      return [...current, source];
    });
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

  async function copyInviteLink(party: DashboardSnapshot["parties"][number]) {
    const invitePath = `/i/${party.token.value}`;
    const inviteUrl = new URL(invitePath, window.location.origin).toString();

    try {
      await copyTextToClipboard(inviteUrl);
      setCopiedLinkPartyId(party.id);
      setStatus(`Copied invite link for ${party.label}.`);
      window.setTimeout(() => {
        setCopiedLinkPartyId((current) => (current === party.id ? null : current));
      }, 1800);
    } catch {
      setCopiedLinkPartyId(null);
      setStatus("Unable to copy link. Open the invitation and copy the URL manually.");
    }
  }

  function stopEnterSubmit(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  const stats = initialData.stats;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(200,180,141,0.18),_transparent_30%),_var(--app-cream)] px-6 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="flex justify-end">
          <Link
            href="/host/seating"
            className={`${primaryButtonClass} px-5 py-3 text-sm`}
          >
            Seating arrangement
          </Link>
        </div>
        {status ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-[1.5rem] border border-[var(--app-line)] bg-white px-5 py-4 text-sm text-stone-700"
          >
            {status}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            ["Invited parties", stats.invitedParties],
            ["Email sends", stats.deliveredMessages],
            ["Opened links", stats.openedInvites],
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
            <div className="flex w-full flex-col gap-4 lg:w-[42rem]">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-stone-800">Choose source</div>
                  {inviteSources.length ? (
                    <span className="text-sm text-stone-600">
                      {selectedSourceCount} parties
                    </span>
                  ) : null}
                </div>
                <div
                  role="group"
                  aria-label="Invitation source"
                  className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-[var(--app-line)] bg-white/70 p-2"
                >
                  {sourceOptions.map((source) => {
                    const active = selectedSourceSet.has(normalizeSource(source));

                    return (
                      <button
                        key={source}
                        type="button"
                        aria-pressed={active}
                        title={`${active ? "Remove" : "Select"} ${source}`}
                        onClick={() => toggleInviteSource(source)}
                        className={toggleButtonClass(active)}
                      >
                        {source}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={showInviteFilters || inviteFiltersActive}
                  title={showInviteFilters ? "Hide invitation filters" : "Show invitation filters"}
                  onClick={() => setShowInviteFilters((current) => !current)}
                  className={toggleButtonClass(showInviteFilters || inviteFiltersActive, "px-5 py-3")}
                >
                  {inviteFiltersActive ? "Filters on" : "Filters"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    sendRequest(
                      "/api/send",
                      inviteBody({
                        channels: ["email"],
                        sources: inviteSources,
                        ...(inviteComingToParty !== "all"
                          ? { coming_to_party: inviteComingToParty === "yes" }
                          : {}),
                        ...(inviteLastDeliveryStatus !== "any"
                          ? { last_delivery_status: inviteLastDeliveryStatus }
                          : {}),
                      }),
                      `Sent invitations for ${selectedSourcesLabel(inviteSources)}.`,
                    )
                  }
                  disabled={Boolean(sending) || inviteSources.length === 0}
                  title="Send invitations to the selected source group"
                  className={cn(secondaryButtonClass, "px-5 py-3 text-sm")}
                >
                  {sending === "/api/send" ? "Sending..." : "Send source invitations"}
                </button>
              </div>
              {showInviteFilters ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="mb-2 text-sm font-semibold text-stone-800">coming_to_party</div>
                    <div
                      role="group"
                      aria-label="coming_to_party filter"
                      className="flex flex-wrap gap-2"
                    >
                      {COMING_TO_PARTY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={inviteComingToParty === option.value}
                          title={`Filter coming_to_party by ${option.label}`}
                          onClick={() => setInviteComingToParty(option.value)}
                          className={toggleButtonClass(inviteComingToParty === option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-semibold text-stone-800">
                      last_delivery_status
                    </div>
                    <div
                      role="group"
                      aria-label="last_delivery_status filter"
                      className="flex flex-wrap gap-2"
                    >
                      {DELIVERY_STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={inviteLastDeliveryStatus === option.value}
                          title={`Filter last_delivery_status by ${option.label}`}
                          onClick={() => setInviteLastDeliveryStatus(option.value)}
                          className={toggleButtonClass(inviteLastDeliveryStatus === option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <select
                  aria-label="Reminder audience"
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
                  title="Send reminder emails to the selected audience"
                  className={cn(secondaryButtonClass, "px-5 py-3 text-sm")}
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
              <form
                onSubmit={addInvitedPerson}
                onKeyDown={stopEnterSubmit}
                className="mt-6 grid gap-5"
              >
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
                    onChange={(event) => updateDisplayName(event.target.value)}
                    placeholder="Generated from guest names"
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
                  Will invite to Dinner in the centre of Florence
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
                  title="Add this invited party to the guest list"
                  className={cn(primaryButtonClass, "w-fit px-5 py-3 text-sm")}
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
                title="Import the CSV rows into the guest list"
                className={cn(secondaryButtonClass, "mt-5 px-5 py-3 text-sm")}
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
                  const email = party.email?.trim();
                  const linkCopied = copiedLinkPartyId === party.id;
                  const attendanceSummary = partyAttendanceSummary(party as Party, party.guests);

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
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                              <span
                                suppressHydrationWarning
                                className={cn(
                                  "rounded-full border px-3 py-1",
                                  party.response
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border-stone-200 bg-stone-50 text-stone-600",
                                )}
                              >
                                {party.response
                                  ? `RSVP received ${formatRelative(party.response.updatedAt)} · ${attendanceSummary}`
                                  : "Awaiting RSVP"}
                              </span>
                              <span
                                suppressHydrationWarning
                                className={cn(
                                  "rounded-full border px-3 py-1",
                                  party.token.openedAt
                                    ? "border-sky-200 bg-sky-50 text-sky-800"
                                    : "border-stone-200 bg-stone-50 text-stone-600",
                                )}
                              >
                                {party.token.openedAt
                                  ? `Opened link ${formatRelative(party.token.openedAt)}`
                                  : "Not opened"}
                              </span>
                            </div>
                          </div>
                          <div className="text-right text-sm text-stone-600">
                            <div>{email || "No email"}</div>
                            <div className="mt-2" suppressHydrationWarning>
                              Last sent {formatRelative(party.lastSentAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <button
                            type="button"
                            onClick={() =>
                              sendRequest(
                                "/api/send",
                                { partyIds: [party.id], channels: ["email"] },
                                `Sent email invite for ${party.label}.`,
                              )
                            }
                            disabled={Boolean(sending)}
                            title={`Send an email invitation to ${party.label}`}
                            className={cn(secondaryButtonClass, "px-4 py-2")}
                          >
                            Email
                          </button>
                          <button
                            type="button"
                            aria-label={`Copy the private invitation link for ${party.label}`}
                            title={`Copy the private invitation link for ${party.label}`}
                            onClick={() => copyInviteLink(party)}
                            className={cn(secondaryButtonClass, "px-4 py-2")}
                          >
                            {linkCopied ? "Copied" : "Copy link"}
                          </button>
                        </div>
                        {latest ? (
                          <div className="text-sm" suppressHydrationWarning>
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
                    <div
                      className="mt-1 text-xs uppercase tracking-[0.24em] text-stone-500"
                      suppressHydrationWarning
                    >
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
