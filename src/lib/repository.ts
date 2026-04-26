import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { nanoid } from "nanoid";

import { parsePartyCsv } from "@/lib/csv";
import { env, hasGoogleSheetsConfig } from "@/lib/env";
import { isReadOnly } from "@/lib/formatters";
import { dispatchDelivery } from "@/lib/providers/delivery";
import { SEED_HOSTS, createSeedState, createToken } from "@/lib/seed-data";
import {
  addSheetGuest,
  getSheetDashboardSnapshot,
  getSheetInvitationByToken,
  importSheetPartiesFromCsv,
  recordSheetInviteOpen,
  regenerateSheetPartyToken,
  saveSheetRsvp,
  sendSheetBatch,
  updateSheetDeliveryStatusFromWebhook,
} from "@/lib/sheets/google-store";
import type { AddGuestInput } from "@/lib/sheets/guest-sheet";
import type {
  AccommodationCard,
  ActivityEvent,
  AppState,
  DashboardSnapshot,
  DeliveryRecord,
  DeliveryStatus,
  Guest,
  HostContentUpdate,
  InvitationView,
  Party,
  SaveRsvpInput,
  SendBatchInput,
} from "@/lib/types";

const DATA_DIR = join(process.cwd(), ".data");
const DATA_FILE = join(DATA_DIR, "mock-state.json");

declare global {
  var __collazzi_write_queue: Promise<unknown> | undefined;
}

async function readState() {
  try {
    const contents = await readFile(DATA_FILE, "utf8");
    return normalizeState(JSON.parse(contents) as AppState);
  } catch {
    const seed = createSeedState();
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

function normalizeState(state: AppState) {
  const primaryHost = SEED_HOSTS[0];
  const primaryEmail = primaryHost.email.toLowerCase();
  const hostIndex = state.hosts.findIndex(
    (host) => host.email.toLowerCase() === primaryEmail || host.role === "owner",
  );

  if (hostIndex >= 0) {
    state.hosts[hostIndex] = { ...primaryHost };
  } else {
    state.hosts.push({ ...primaryHost });
  }

  state.hosts = state.hosts.filter(
    (host) => host.id === primaryHost.id || host.email.toLowerCase() !== primaryEmail,
  );

  return state;
}

async function writeState(state: AppState) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function updateState<T>(updater: (state: AppState) => Promise<T> | T) {
  const queue = globalThis.__collazzi_write_queue ?? Promise.resolve();
  let result: T | undefined;
  let thrown: unknown;

  globalThis.__collazzi_write_queue = queue.then(async () => {
    try {
      const state = await readState();
      result = await updater(state);
      await writeState(state);
    } catch (error) {
      thrown = error;
    }
  });

  await globalThis.__collazzi_write_queue;
  if (thrown) {
    globalThis.__collazzi_write_queue = Promise.resolve();
    throw thrown;
  }
  return result as T;
}

function guestsForParty(state: AppState, partyId: string) {
  return state.guests.filter((guest) => guest.partyId === partyId);
}

function deliveriesForParty(state: AppState, partyId: string) {
  return state.deliveries.filter((delivery) => delivery.partyId === partyId);
}

function addActivity(state: AppState, message: string, actor: string, type: ActivityEvent["type"]) {
  state.activities.unshift({
    id: nanoid(),
    type,
    createdAt: new Date().toISOString(),
    actor,
    message,
  });
}

function getAttendanceStatus(selections: Record<string, boolean>) {
  const anyAttending = Object.values(selections).some(Boolean);
  return anyAttending ? "attending" : "not_attending";
}

function inviteUrl(token: string) {
  return `${env.APP_URL.replace(/\/$/, "")}/i/${token}`;
}

function filterParties(state: AppState, input: SendBatchInput) {
  const selected = input.partyIds?.length
    ? state.parties.filter((party) => input.partyIds?.includes(party.id))
    : state.parties;

  if (!input.filter || input.filter === "all") {
    return selected;
  }

  return selected.filter((party) => {
    if (input.filter === "awaiting_response") {
      return !party.response;
    }

    return party.response?.status === input.filter;
  });
}

export async function recordInviteOpen(tokenValue: string) {
  if (hasGoogleSheetsConfig()) {
    return recordSheetInviteOpen(tokenValue);
  }

  return updateState((state) => {
    const party = state.parties.find((candidate) => candidate.token.value === tokenValue);
    if (!party) return null;

    if (!party.token.openedAt) {
      party.token.openedAt = new Date().toISOString();
      const latest = deliveriesForParty(state, party.id)
        .filter((delivery) => delivery.kind === "invite")
        .sort((left, right) => right.sentAt.localeCompare(left.sentAt))[0];

      if (latest && latest.status !== "opened") {
        latest.status = "opened";
        latest.openedAt = party.token.openedAt;
      }

      addActivity(state, `${party.label} opened their invitation.`, "guest", "invite_opened");
    }

    return party;
  });
}

export async function getInvitationByToken(tokenValue: string): Promise<InvitationView | null> {
  if (hasGoogleSheetsConfig()) {
    return getSheetInvitationByToken(tokenValue, await readState());
  }

  const state = await readState();
  const party = state.parties.find((candidate) => candidate.token.value === tokenValue);

  if (!party || !party.token.active) {
    return null;
  }

  const tokenExpired = party.token.expiresAt
    ? new Date(party.token.expiresAt).getTime() < Date.now()
    : false;

  if (tokenExpired) {
    return null;
  }

  return {
    event: state.event,
    party,
    guests: guestsForParty(state, party.id),
    questions: state.questions,
    itinerary: state.itinerary,
    accommodations: state.accommodations,
    deliveries: deliveriesForParty(state, party.id),
    readOnly: isReadOnly(state.event.rsvpDeadline),
  };
}

export async function saveRsvp(input: SaveRsvpInput) {
  if (hasGoogleSheetsConfig()) {
    return saveSheetRsvp(input, await readState());
  }

  return updateState((state) => {
    const party = state.parties.find((candidate) => candidate.token.value === input.token);

    if (!party) {
      throw new Error("Invitation not found.");
    }

    if (isReadOnly(state.event.rsvpDeadline)) {
      throw new Error("RSVPs are closed for this invitation.");
    }

    party.response = {
      status: getAttendanceStatus(input.selections),
      guestSelections: input.selections,
      answers: input.answers,
      note: input.note,
      updatedAt: new Date().toISOString(),
    };

    addActivity(state, `${party.label} submitted an RSVP.`, "guest", "rsvp_submitted");

    return party.response;
  });
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (hasGoogleSheetsConfig()) {
    return getSheetDashboardSnapshot(await readState());
  }

  const state = await readState();
  const hydratedParties = state.parties.map((party) => ({
    ...party,
    guests: guestsForParty(state, party.id),
    deliveries: deliveriesForParty(state, party.id),
  }));

  const attendingGuests = hydratedParties.reduce((count, party) => {
    if (!party.response) return count;
    return (
      count +
      party.guests.filter((guest) => party.response?.guestSelections[guest.id]).length
    );
  }, 0);

  const declinedGuests = hydratedParties.reduce((count, party) => {
    if (!party.response) return count;
    return (
      count +
      party.guests.filter((guest) => !party.response?.guestSelections[guest.id]).length
    );
  }, 0);

  return {
    event: state.event,
    hosts: state.hosts,
    questions: state.questions,
    itinerary: state.itinerary,
    accommodations: state.accommodations,
    parties: hydratedParties,
    stats: {
      invitedParties: state.parties.length,
      deliveredMessages: state.deliveries.length,
      openedInvites: state.parties.filter((party) => Boolean(party.token.openedAt)).length,
      attendingGuests,
      declinedGuests,
      pendingParties: state.parties.filter((party) => !party.response).length,
    },
    activities: state.activities.slice(0, 12),
  };
}

export async function updateContent(input: HostContentUpdate, actor: string) {
  return updateState((state) => {
    state.event = input.event;
    state.questions = input.questions;
    state.itinerary = input.itinerary;
    state.accommodations = input.accommodations;
    addActivity(state, "Updated invitation content from the host dashboard.", actor, "content_updated");
    return state.event;
  });
}

export async function importPartiesFromCsv(csv: string, actor: string) {
  if (hasGoogleSheetsConfig()) {
    return importSheetPartiesFromCsv(csv, actor);
  }

  const rows = parsePartyCsv(csv);

  return updateState((state) => {
    rows.forEach((row) => {
      if (!row.label || row.guests.length === 0) {
        return;
      }

      const partyId = nanoid();
      const guestIds: string[] = [];

      row.guests.forEach((name) => {
        const guestId = nanoid();
        guestIds.push(guestId);
        state.guests.push({ id: guestId, partyId, name });
      });

      state.parties.unshift({
        id: partyId,
        label: row.label,
        email: row.email,
        notes: row.notes,
        tags: row.tags,
        guestIds,
        token: { value: createToken("guest"), active: true },
        deliveryIds: [],
      });
    });

    addActivity(
      state,
      `Imported ${rows.length} guest row${rows.length === 1 ? "" : "s"} from CSV.`,
      actor,
      "guests_imported",
    );

    return rows.length;
  });
}

export async function addGuest(input: AddGuestInput, actor: string) {
  if (hasGoogleSheetsConfig()) {
    return addSheetGuest(input, actor);
  }

  return updateState((state) => {
    const partyId = nanoid();
    const guestId = nanoid();
    const token = createToken("guest");
    const label = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
    const tags = [
      input.invitedByAle ? "invited_by_ale" : "",
      input.invitedByBona ? "invited_by_bona" : "",
      input.invitedByMum ? "invited_by_mum" : "",
      input.willInviteToWalkingDinner ? "walking_dinner_invited" : "",
      input.sentWhatsappSaveTheDate ? "sent_whatsapp_save_the_date" : "",
      input.sentInstagramSaveTheDate ? "sent_instagram_save_the_date" : "",
      input.source ?? "",
    ].filter(Boolean);

    state.guests.push({
      id: guestId,
      partyId,
      name: label,
    });
    state.parties.unshift({
      id: partyId,
      label,
      email: input.email,
      notes: input.source,
      tags,
      guestIds: [guestId],
      token: {
        value: token,
        active: true,
      },
      deliveryIds: [],
    });

    addActivity(state, `Added ${label} to the guest list.`, actor, "guests_imported");

    return {
      guestId,
      token,
      inviteUrl: inviteUrl(token),
    };
  });
}

export async function regeneratePartyToken(partyId: string, actor: string) {
  if (hasGoogleSheetsConfig()) {
    return regenerateSheetPartyToken(partyId, actor);
  }

  return updateState((state) => {
    const party = state.parties.find((candidate) => candidate.id === partyId);
    if (!party) {
      throw new Error("Party not found.");
    }

    party.token = {
      value: createToken("guest"),
      active: true,
    };

    addActivity(state, `Regenerated a private link for ${party.label}.`, actor, "token_regenerated");
    return party.token.value;
  });
}

export async function sendBatch(input: SendBatchInput, actor: string) {
  if (hasGoogleSheetsConfig()) {
    return sendSheetBatch(input, actor, await readState());
  }

  const deliveries = await updateState(async (state) => {
    const parties = filterParties(state, input);
    const created: DeliveryRecord[] = [];

    for (const party of parties) {
      for (const channel of input.channels) {
        const recipient = party.email;
        if (!recipient) {
          continue;
        }

        const dispatched = await dispatchDelivery({
          channel,
          recipient,
          inviteUrl: inviteUrl(party.token.value),
          partyLabel: party.label,
          eventTitle: state.event.summaryName,
          kind: input.kind,
          summaryDateLabel: state.event.summaryDateLabel,
          summaryAddressName: state.event.summaryAddressName,
          summaryAddressLabel: state.event.summaryAddressLabel,
          rsvpDeadline: state.event.rsvpDeadline,
          heroImageSrc: state.event.heroBackImageSrc,
        });

        const delivery: DeliveryRecord = {
          id: nanoid(),
          partyId: party.id,
          channel,
          kind: input.kind,
          recipient,
          subjectLine: dispatched.subjectLine,
          bodyPreview: dispatched.bodyPreview,
          status: dispatched.status,
          providerMessageId: dispatched.providerMessageId,
          sentAt: new Date().toISOString(),
          sandbox: dispatched.sandbox,
        };

        state.deliveries.unshift(delivery);
        party.deliveryIds.unshift(delivery.id);
        party.lastSentAt = delivery.sentAt;
        created.push(delivery);

        addActivity(
          state,
          `${input.kind === "invite" ? "Sent" : "Queued"} ${channel} ${input.kind} for ${party.label}.`,
          actor,
          "delivery_created",
        );
      }
    }

    return created;
  });

  return deliveries;
}

export async function updateDeliveryStatusFromWebhook(
  providerMessageId: string,
  status: DeliveryStatus,
) {
  if (hasGoogleSheetsConfig()) {
    return updateSheetDeliveryStatusFromWebhook(providerMessageId, status);
  }

  return updateState((state) => {
    const delivery = state.deliveries.find(
      (candidate) => candidate.providerMessageId === providerMessageId,
    );

    if (!delivery) {
      return null;
    }

    delivery.status = status;
    const timestamp = new Date().toISOString();
    if (status === "delivered") {
      delivery.deliveredAt = timestamp;
    }
    if (status === "opened") {
      delivery.openedAt = timestamp;
    }

    addActivity(
      state,
      `Webhook updated ${delivery.channel} delivery ${delivery.id} to ${status}.`,
      "provider",
      "delivery_updated",
    );

    return delivery;
  });
}

export async function previewSeedLinks() {
  const snapshot = await getDashboardSnapshot();
  return snapshot.parties.slice(0, 3).map((party) => ({
    label: party.label,
    token: party.token.value,
  }));
}

export async function recordHostLogin(actor: string) {
  return updateState((state) => {
    addActivity(state, `${actor} accessed the host dashboard.`, actor, "host_login");
    const host = state.hosts.find((candidate) => candidate.email === actor);
    if (host) {
      host.lastLoginAt = new Date().toISOString();
    }
    return true;
  });
}

export function emptyAccommodationCard(): AccommodationCard {
  return {
    id: nanoid(),
    title: "",
    city: "",
    address: "",
    addressLines: [],
    phone: "",
    ctaLabel: "",
    ctaUrl: "",
    imageSrc: "/assets/collazzi/horto-convento.jpeg",
    notes: "",
  };
}

export function emptyGuest(name = "Guest") {
  return {
    id: nanoid(),
    partyId: nanoid(),
    name,
  } satisfies Guest;
}

export function emptyParty(): Party {
  return {
    id: nanoid(),
    label: "",
    guestIds: [],
    tags: [],
    token: { value: createToken("guest"), active: true },
    deliveryIds: [],
  };
}
