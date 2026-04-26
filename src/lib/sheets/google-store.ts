import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

import { nanoid } from "nanoid";

import { env, isLocalAppUrl } from "@/lib/env";
import { isReadOnly } from "@/lib/formatters";
import { dispatchDelivery } from "@/lib/providers/delivery";
import { parsePartyCsv } from "@/lib/csv";
import {
  buildInviteUrl,
  buildRsvpColumnUpdates,
  columnLetter,
  findGuestSheetIntegrityErrors,
  parseGuestSheet,
  sheetGuestResponse,
  toSheetBoolean,
  type AddGuestInput,
  type GuestSheetHeader,
  type GuestSheetTable,
  type SheetColumnUpdate,
  type SheetGuest,
} from "@/lib/sheets/guest-sheet";
import type {
  ActivityEvent,
  AppState,
  DashboardSnapshot,
  DeliveryRecord,
  DeliveryStatus,
  Guest,
  InvitationView,
  Party,
  PartyResponse,
  SaveRsvpInput,
  SendBatchInput,
} from "@/lib/types";

const ACTIVITY_SHEET_TITLE = "Activity";
const ACTIVITY_HEADERS = ["id", "type", "created_at", "actor", "message"];
const PARTY_ONLY_BACK_IMAGE_SRC = "/assets/collazzi/invito-save-date.jpg";
const CHECKBOX_HEADERS: GuestSheetHeader[] = [
  "token_active",
  "invited_by_ale",
  "invited_by_bona",
  "invited_by_mum",
  "counted",
  "sent_whatsapp_save_the_date",
  "sent_instagram_save_the_date",
  "will_invite_to_walking_dinner",
  "coming_to_walking_dinner",
  "coming_to_party",
  "transfer_needed",
  "not_coming",
];
const nodeRequire = createRequire(import.meta.url);

interface LoadedGuestSheet {
  tabTitle: string;
  table: GuestSheetTable;
}

interface CellWrite {
  rowNumber: number;
  header: GuestSheetHeader;
  value: string;
}

interface SheetsClient {
  spreadsheets: {
    values: {
      get(input: Record<string, unknown>): Promise<{ data: { values?: unknown } }>;
      update(input: Record<string, unknown>): Promise<unknown>;
      append(input: Record<string, unknown>): Promise<unknown>;
      batchUpdate(input: Record<string, unknown>): Promise<unknown>;
    };
    get(input: Record<string, unknown>): Promise<{
      data: {
        sheets?: Array<{
          properties?: {
            sheetId?: number;
            title?: string;
          };
        }>;
      };
    }>;
    batchUpdate(input: Record<string, unknown>): Promise<unknown>;
  };
}

interface GoogleApisModule {
  google: {
    auth: {
      JWT: new (input: { email?: string; key?: string; scopes: string[] }) => unknown;
    };
    sheets(input: { version: "v4"; auth: unknown }): SheetsClient;
  };
}

let cachedStore: GoogleSheetsGuestStore | null = null;

export function getGoogleSheetsGuestStore() {
  cachedStore ??= new GoogleSheetsGuestStore();
  return cachedStore;
}

export async function getSheetInvitationByToken(
  token: string,
  state: AppState,
): Promise<InvitationView | null> {
  const store = getGoogleSheetsGuestStore();
  const { table } = await store.loadGuests();
  const guest = table.guests.find(
    (candidate) => candidate.token === token && candidate.tokenActive,
  );

  if (!guest) {
    return null;
  }

  const party = partyFromSheetGuest(guest);

  return {
    event: eventForSheetGuest(state.event, guest),
    party,
    guests: [guestFromSheetGuest(guest)],
    questions: questionsForSheetGuest(state.questions, guest),
    itinerary: itineraryForSheetGuest(state.itinerary, guest),
    accommodations: state.accommodations,
    deliveries: deliveriesFromSheetGuest(guest, state.event.summaryName),
    readOnly: isReadOnly(state.event.rsvpDeadline),
  };
}

export async function recordSheetInviteOpen(token: string, actor = "guest") {
  const store = getGoogleSheetsGuestStore();
  const { table } = await store.loadGuests();
  const guest = table.guests.find(
    (candidate) => candidate.token === token && candidate.tokenActive,
  );

  if (!guest) {
    return null;
  }

  if (!guest.inviteOpenedAt) {
    const timestamp = new Date().toISOString();
    await store.writeGuestColumns(table, guest.rowNumber, [
      { header: "invite_opened_at", value: timestamp },
      { header: "last_delivery_status", value: "opened" },
    ]);
    await store.appendActivity("invite_opened", actor, `${labelForSheetGuest(guest)} opened their invitation.`);
  }

  return partyFromSheetGuest(guest);
}

export async function saveSheetRsvp(input: SaveRsvpInput, state: AppState) {
  const store = getGoogleSheetsGuestStore();
  const { table } = await store.loadGuests();
  const guest = table.guests.find(
    (candidate) => candidate.token === input.token && candidate.tokenActive,
  );

  if (!guest) {
    throw new Error("Invitation not found.");
  }

  if (isReadOnly(state.event.rsvpDeadline)) {
    throw new Error("RSVPs are closed for this invitation.");
  }

  const timestamp = new Date().toISOString();
  const rsvpInput = guest.willInviteToWalkingDinner
    ? input
    : {
        ...input,
        answers: {
          ...input.answers,
          question_walking_dinner: false,
        },
      };
  await store.writeGuestColumns(
    table,
    guest.rowNumber,
    buildRsvpColumnUpdates(rsvpInput, timestamp),
  );
  await store.appendActivity(
    "rsvp_submitted",
    "guest",
    `${labelForSheetGuest(guest)} submitted an RSVP.`,
  );

  const attending = Object.values(input.selections).some(Boolean);

  return {
    status: attending ? "attending" : "not_attending",
    guestSelections: {
      [guest.guestId]: attending,
    },
    answers: {
      question_walking_dinner: attending && Boolean(rsvpInput.answers.question_walking_dinner),
      question_party: attending && Boolean(rsvpInput.answers.question_party),
      question_transfer: attending && Boolean(rsvpInput.answers.question_transfer),
    },
    note: input.note,
    updatedAt: timestamp,
  } satisfies PartyResponse;
}

export async function getSheetDashboardSnapshot(state: AppState): Promise<DashboardSnapshot> {
  const store = getGoogleSheetsGuestStore();
  const { table } = await store.loadGuests();
  const hydratedParties = table.guests.map((guest) => ({
    ...partyFromSheetGuest(guest),
    guests: [guestFromSheetGuest(guest)],
    deliveries: deliveriesFromSheetGuest(guest, state.event.summaryName),
  }));
  const attendingGuests = hydratedParties.filter(
    (party) => party.response?.guestSelections[party.id],
  ).length;
  const declinedGuests = hydratedParties.filter(
    (party) => party.response && !party.response.guestSelections[party.id],
  ).length;
  const activities = await store.readActivities();

  return {
    event: state.event,
    hosts: state.hosts,
    questions: state.questions,
    itinerary: state.itinerary,
    accommodations: state.accommodations,
    parties: hydratedParties,
    stats: {
      invitedParties: hydratedParties.length,
      deliveredMessages: hydratedParties.reduce(
        (count, party) => count + party.deliveries.length,
        0,
      ),
      openedInvites: table.guests.filter((guest) => Boolean(guest.inviteOpenedAt)).length,
      attendingGuests,
      declinedGuests,
      pendingParties: hydratedParties.filter((party) => !party.response).length,
    },
    activities,
  };
}

export async function importSheetPartiesFromCsv(csv: string, actor: string) {
  const rows = parsePartyCsv(csv);
  const store = getGoogleSheetsGuestStore();
  const loaded = await store.loadGuests();
  const appendRows: string[][] = [];

  for (const row of rows) {
    const names = row.guests.length ? row.guests : [row.label];

    for (const name of names) {
      if (!name) continue;
      const guestId = createGuestId();
      const token = createGuestToken();
      const splitName = splitGuestName(name);

      appendRows.push(
        rowValuesFromRecord(loaded.table.headers, {
          guest_id: guestId,
          token,
          token_active: "TRUE",
          invite_url: buildInviteUrl(env.APP_URL, token),
          last_name: splitName.lastName,
          first_name: splitName.firstName,
          email: row.email ?? "",
          source: row.tags.join("; "),
          admin_notes: row.notes ?? "",
        }),
      );
    }
  }

  if (appendRows.length) {
    await store.appendGuestRows(loaded.tabTitle, loaded.table.headers, appendRows);
  }

  await store.appendActivity(
    "guests_imported",
    actor,
    `Imported ${appendRows.length} guest row${appendRows.length === 1 ? "" : "s"} from CSV.`,
  );

  return appendRows.length;
}

export async function addSheetGuest(input: AddGuestInput, actor: string) {
  const store = getGoogleSheetsGuestStore();
  const loaded = await store.loadGuests();
  const guestId = createGuestId();
  const token = createGuestToken();
  const inviteUrl = buildInviteUrl(env.APP_URL, token);
  const label = labelForName(input.firstName, input.lastName, input.email);

  await store.appendGuestRows(loaded.tabTitle, loaded.table.headers, [
    rowValuesFromRecord(loaded.table.headers, {
      last_name: input.lastName,
      first_name: input.firstName,
      email: input.email ?? "",
      invited_by_ale: toSheetBoolean(input.invitedByAle),
      invited_by_bona: toSheetBoolean(input.invitedByBona),
      invited_by_mum: toSheetBoolean(input.invitedByMum),
      counted: "TRUE",
      source: input.source ?? "",
      will_invite_to_walking_dinner: toSheetBoolean(input.willInviteToWalkingDinner),
      sent_whatsapp_save_the_date: toSheetBoolean(input.sentWhatsappSaveTheDate),
      sent_instagram_save_the_date: toSheetBoolean(input.sentInstagramSaveTheDate),
      guest_id: guestId,
      token,
      token_active: "TRUE",
      invite_url: inviteUrl,
    }),
  ]);

  await store.appendActivity("guests_imported", actor, `Added ${label} to the guest list.`);

  return {
    guestId,
    token,
    inviteUrl,
  };
}

export async function regenerateSheetPartyToken(partyId: string, actor: string) {
  const store = getGoogleSheetsGuestStore();
  const { table } = await store.loadGuests();
  const guest = table.guests.find((candidate) => candidate.guestId === partyId);

  if (!guest) {
    throw new Error("Party not found.");
  }

  const token = createGuestToken();
  await store.writeGuestColumns(table, guest.rowNumber, [
    { header: "token", value: token },
    { header: "token_active", value: "TRUE" },
    { header: "invite_url", value: buildInviteUrl(env.APP_URL, token) },
  ]);
  await store.appendActivity(
    "token_regenerated",
    actor,
    `Regenerated a private link for ${labelForSheetGuest(guest)}.`,
  );

  return token;
}

export async function sendSheetBatch(input: SendBatchInput, actor: string, state: AppState) {
  const store = getGoogleSheetsGuestStore();
  const { table } = await store.loadGuests();
  const candidates = filterSheetGuests(table.guests, input);
  const created: DeliveryRecord[] = [];

  for (const guest of candidates) {
    for (const channel of input.channels) {
      const recipient = guest.email;
      if (!recipient) {
        continue;
      }

      const dispatched = await dispatchDelivery({
        channel,
        recipient,
        inviteUrl: buildInviteUrl(env.APP_URL, guest.token),
        partyLabel: labelForSheetGuest(guest),
        eventTitle: state.event.summaryName,
        kind: input.kind,
        summaryDateLabel: state.event.summaryDateLabel,
        summaryAddressName: state.event.summaryAddressName,
        summaryAddressLabel: state.event.summaryAddressLabel,
        rsvpDeadline: state.event.rsvpDeadline,
        heroImageSrc: eventForSheetGuest(state.event, guest).heroBackImageSrc,
      });
      const timestamp = new Date().toISOString();
      const delivery = {
        id: `delivery_${nanoid(12)}`,
        partyId: guest.guestId,
        channel,
        kind: input.kind,
        recipient,
        subjectLine: dispatched.subjectLine,
        bodyPreview: dispatched.bodyPreview,
        status: dispatched.status,
        providerMessageId: dispatched.providerMessageId,
        sentAt: timestamp,
        sandbox: dispatched.sandbox,
      } satisfies DeliveryRecord;
      const updates: SheetColumnUpdate[] = [
        { header: "last_delivery_status", value: dispatched.status },
        { header: "provider_message_id", value: dispatched.providerMessageId ?? "" },
        { header: "last_error", value: dispatched.status === "failed" ? "Delivery failed." : "" },
      ];

      if (input.kind === "invite") {
        updates.push({ header: "sent_invite_at", value: timestamp });
      }

      await store.writeGuestColumns(table, guest.rowNumber, updates);
      await store.appendActivity(
        "delivery_created",
        actor,
        `${input.kind === "invite" ? "Sent" : "Queued"} ${channel} ${input.kind} for ${labelForSheetGuest(guest)}.`,
      );
      created.push(delivery);
    }
  }

  return created;
}

export async function updateSheetDeliveryStatusFromWebhook(
  providerMessageId: string,
  status: DeliveryStatus,
) {
  const store = getGoogleSheetsGuestStore();
  const { table } = await store.loadGuests();
  const guest = table.guests.find(
    (candidate) => candidate.providerMessageId === providerMessageId,
  );

  if (!guest) {
    return null;
  }

  const updates: SheetColumnUpdate[] = [
    { header: "last_delivery_status", value: status },
    { header: "last_error", value: status === "failed" ? "Delivery failed." : "" },
  ];

  if (status === "opened" && !guest.inviteOpenedAt) {
    updates.push({ header: "invite_opened_at", value: new Date().toISOString() });
  }

  await store.writeGuestColumns(table, guest.rowNumber, updates);
  await store.appendActivity(
    "delivery_updated",
    "provider",
    `Webhook updated delivery for ${labelForSheetGuest(guest)} to ${status}.`,
  );

  return {
    ...deliveriesFromSheetGuest(
      {
        ...guest,
        lastDeliveryStatus: status,
      },
      "Collazzi",
    )[0],
    status,
  };
}

export class GoogleSheetsGuestStore {
  private sheetsPromise?: Promise<SheetsClient>;
  private guestTabTitle?: string;
  private checkboxValidationEnsured = false;

  async loadGuests(): Promise<LoadedGuestSheet> {
    const tabTitle = await this.getGuestTabTitle();
    const sheets = await this.getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      range: rangeFor(tabTitle, "A:ZZ"),
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const values = normalizeValues(response.data.values);
    const table = parseGuestSheet(values, env.APP_URL);
    validateGuestSheetIntegrity(table);

    if (table.needsHeaderUpdate) {
      assertSheetMutationAllowed();
      await sheets.spreadsheets.values.update({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        range: rangeFor(
          tabTitle,
          `A${table.headerRowIndex + 1}:${columnLetter(table.headers.length - 1)}${table.headerRowIndex + 1}`,
        ),
        valueInputOption: "RAW",
        requestBody: {
          values: [table.headers],
        },
      });
    }

    await this.ensureAppValues(table);
    await this.ensureCheckboxColumns(tabTitle, table);

    return { tabTitle, table };
  }

  async writeGuestColumns(
    table: GuestSheetTable,
    rowNumber: number,
    updates: SheetColumnUpdate[],
  ) {
    await this.writeCells(
      updates.map((update) => ({
        rowNumber,
        header: update.header,
        value: update.value,
      })),
      table,
    );
  }

  async appendGuestRows(tabTitle: string, headers: string[], rows: string[][]) {
    assertSheetMutationAllowed();
    const sheets = await this.getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      range: rangeFor(tabTitle, `A:${columnLetter(headers.length - 1)}`),
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: rows,
      },
    });
  }

  async appendActivity(type: ActivityEvent["type"], actor: string, message: string) {
    assertSheetMutationAllowed();
    const sheets = await this.getSheets();
    await this.ensureActivitySheet();
    await sheets.spreadsheets.values.append({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      range: rangeFor(ACTIVITY_SHEET_TITLE, "A:E"),
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[`activity_${nanoid(12)}`, type, new Date().toISOString(), actor, message]],
      },
    });
  }

  async readActivities() {
    try {
      const sheets = await this.getSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        range: rangeFor(ACTIVITY_SHEET_TITLE, "A:E"),
      });
      const rows = normalizeValues(response.data.values);

      return rows
        .slice(1)
        .reverse()
        .slice(0, 12)
        .map((row) => ({
          id: row[0] || `activity_${nanoid(8)}`,
          type: activityType(row[1]),
          createdAt: row[2] || new Date(0).toISOString(),
          actor: row[3] || "system",
          message: row[4] || "",
        }));
    } catch {
      return [];
    }
  }

  private async ensureAppValues(table: GuestSheetTable) {
    const writes: CellWrite[] = [];

    for (const guest of table.guests) {
      let guestId = guest.guestId;
      let token = guest.token;

      if (!guestId) {
        guestId = createGuestId();
        guest.guestId = guestId;
        writes.push({ rowNumber: guest.rowNumber, header: "guest_id", value: guestId });
      }

      if (!token) {
        token = createGuestToken();
        guest.token = token;
        writes.push({ rowNumber: guest.rowNumber, header: "token", value: token });
        writes.push({ rowNumber: guest.rowNumber, header: "token_active", value: "TRUE" });
        guest.tokenActive = true;
        guest.tokenActiveExplicit = true;
      }

      if (!guest.tokenActiveExplicit) {
        writes.push({ rowNumber: guest.rowNumber, header: "token_active", value: "TRUE" });
        guest.tokenActive = true;
        guest.tokenActiveExplicit = true;
      }

      const inviteUrl = buildInviteUrl(env.APP_URL, token);
      if (token && guest.inviteUrl !== inviteUrl) {
        writes.push({ rowNumber: guest.rowNumber, header: "invite_url", value: inviteUrl });
        guest.inviteUrl = inviteUrl;
      }
    }

    await this.writeCells(writes, table);
  }

  private async ensureCheckboxColumns(tabTitle: string, table: GuestSheetTable) {
    if (this.checkboxValidationEnsured) {
      return;
    }

    const sheetId = await this.getSheetIdByTitle(tabTitle);
    const requests = CHECKBOX_HEADERS.map((header) => table.columnMap[header])
      .filter((columnIndex): columnIndex is number => columnIndex !== undefined)
      .map((columnIndex) => ({
        setDataValidation: {
          range: {
            sheetId,
            startRowIndex: table.headerRowIndex + 1,
            startColumnIndex: columnIndex,
            endColumnIndex: columnIndex + 1,
          },
          rule: {
            condition: {
              type: "BOOLEAN",
            },
            strict: true,
            showCustomUi: true,
          },
        },
      }));

    if (requests.length) {
      assertSheetMutationAllowed();
      const sheets = await this.getSheets();
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: env.GOOGLE_SHEETS_ID,
          requestBody: {
            requests,
          },
        });
      } catch (error) {
        if (!isTypedColumnValidationError(error)) {
          throw error;
        }
      }
    }

    this.checkboxValidationEnsured = true;
  }

  private async writeCells(writes: CellWrite[], table: GuestSheetTable) {
    if (!writes.length) {
      return;
    }

    const tabTitle = await this.getGuestTabTitle();
    assertSheetMutationAllowed();
    const sheets = await this.getSheets();
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: writes.map((write) => {
          const columnIndex = table.columnMap[write.header];
          if (columnIndex === undefined) {
            throw new Error(`Missing Google Sheet column: ${write.header}`);
          }

          const cell = `${columnLetter(columnIndex)}${write.rowNumber}`;
          return {
            range: rangeFor(tabTitle, cell),
            values: [[write.value]],
          };
        }),
      },
    });
  }

  private async ensureActivitySheet() {
    const sheets = await this.getSheets();
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
    });
    const exists = metadata.data.sheets?.some(
      (sheet) => sheet.properties?.title === ACTIVITY_SHEET_TITLE,
    );

    if (!exists) {
      assertSheetMutationAllowed();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: ACTIVITY_SHEET_TITLE,
                },
              },
            },
          ],
        },
      });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      range: rangeFor(ACTIVITY_SHEET_TITLE, "A1:E1"),
    });
    const headerRow = normalizeValues(response.data.values)[0] ?? [];

    if (ACTIVITY_HEADERS.some((header, index) => headerRow[index] !== header)) {
      assertSheetMutationAllowed();
      await sheets.spreadsheets.values.update({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        range: rangeFor(ACTIVITY_SHEET_TITLE, "A1:E1"),
        valueInputOption: "RAW",
        requestBody: {
          values: [ACTIVITY_HEADERS],
        },
      });
    }
  }

  private async getGuestTabTitle() {
    if (this.guestTabTitle) {
      return this.guestTabTitle;
    }

    if (env.GOOGLE_SHEETS_TAB) {
      this.guestTabTitle = env.GOOGLE_SHEETS_TAB;
      return this.guestTabTitle;
    }

    const sheets = await this.getSheets();
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
    });
    const gid = Number(env.GOOGLE_SHEETS_GID);
    const match = metadata.data.sheets?.find((sheet) => sheet.properties?.sheetId === gid);
    const title = match?.properties?.title;

    if (!title) {
      throw new Error("Unable to find Google Sheets tab from GOOGLE_SHEETS_GID.");
    }

    this.guestTabTitle = title;
    return title;
  }

  private async getSheetIdByTitle(tabTitle: string) {
    const sheets = await this.getSheets();
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
    });
    const match = metadata.data.sheets?.find((sheet) => sheet.properties?.title === tabTitle);
    const sheetId = match?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error(`Unable to find Google Sheets tab: ${tabTitle}.`);
    }

    return sheetId;
  }

  private async getSheets() {
    this.sheetsPromise ??= this.createSheetsClient();
    return this.sheetsPromise;
  }

  private async createSheetsClient() {
    const { google } = nodeRequire("googleapis") as GoogleApisModule;
    const serviceAccount = await loadServiceAccountCredentials();
    const auth = new google.auth.JWT({
      email: serviceAccount.email,
      key: serviceAccount.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return google.sheets({ version: "v4", auth });
  }
}

function validateGuestSheetIntegrity(table: GuestSheetTable) {
  const errors = findGuestSheetIntegrityErrors(table.guests);
  if (!errors.length) {
    return;
  }

  const details = errors
    .map((error) => `${error.field} "${error.value}" appears on rows ${error.rows.join(", ")}`)
    .join("; ");

  throw new Error(`Google Sheet has duplicate guest identifiers: ${details}.`);
}

function assertSheetMutationAllowed() {
  if (!isLocalAppUrl() || env.ALLOW_LOCAL_SHEET_MUTATION) {
    return;
  }

  throw new Error(
    "Refusing to mutate Google Sheets while APP_URL is local. Set ALLOW_LOCAL_SHEET_MUTATION=true for an intentional local sheet update.",
  );
}

function isTypedColumnValidationError(error: unknown) {
  return error instanceof Error && error.message.includes("typed columns");
}

async function loadServiceAccountCredentials() {
  let credentials: { email?: string; privateKey?: string };

  if (env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    const raw = await readFile(env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, "utf8");
    const key = JSON.parse(raw) as { client_email?: string; private_key?: string };
    credentials = {
      email: key.client_email,
      privateKey: key.private_key?.replace(/\\n/g, "\n"),
    };
  } else {
    credentials = {
      email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };
  }

  if (!credentials.email || !credentials.privateKey) {
    throw new Error("Google Sheets service account credentials are incomplete.");
  }

  return credentials;
}

function filterSheetGuests(guests: SheetGuest[], input: SendBatchInput) {
  const selected = input.partyIds?.length
    ? guests.filter((guest) => input.partyIds?.includes(guest.guestId))
    : guests;

  if (!input.filter || input.filter === "all") {
    return selected;
  }

  return selected.filter((guest) => {
    const response = sheetGuestResponse(guest);
    if (input.filter === "awaiting_response") {
      return !response;
    }

    return response?.status === input.filter;
  });
}

function partyFromSheetGuest(guest: SheetGuest): Party {
  const response = sheetGuestResponse(guest);

  return {
    id: guest.guestId,
    label: labelForSheetGuest(guest),
    guestIds: [guest.guestId],
    email: guest.email,
    notes: guest.adminNotes,
    tags: tagsForSheetGuest(guest),
    token: {
      value: guest.token,
      active: guest.tokenActive,
      openedAt: guest.inviteOpenedAt,
    },
    response,
    deliveryIds: deliveriesFromSheetGuest(guest, "Collazzi").map((delivery) => delivery.id),
    lastSentAt: guest.sentInviteAt,
  };
}

function eventForSheetGuest(event: AppState["event"], guest: SheetGuest) {
  if (guest.willInviteToWalkingDinner) {
    return event;
  }

  return {
    ...event,
    heroBackImageSrc: PARTY_ONLY_BACK_IMAGE_SRC,
    summaryDateLabel: partyOnlyDateLabel(event.summaryDateLabel),
  };
}

function questionsForSheetGuest(questions: AppState["questions"], guest: SheetGuest) {
  if (guest.willInviteToWalkingDinner) {
    return questions;
  }

  return questions.filter((question) => question.id !== "question_walking_dinner");
}

function itineraryForSheetGuest(itinerary: AppState["itinerary"], guest: SheetGuest) {
  if (guest.willInviteToWalkingDinner) {
    return itinerary;
  }

  return itinerary.filter((item) => item.id !== "itinerary_dinner");
}

function partyOnlyDateLabel(label: string) {
  const parts = label.split(/\s+[–-]\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) ?? label;
}

function guestFromSheetGuest(guest: SheetGuest): Guest {
  return {
    id: guest.guestId,
    partyId: guest.guestId,
    name: labelForSheetGuest(guest),
  };
}

function deliveriesFromSheetGuest(guest: SheetGuest, eventTitle: string): DeliveryRecord[] {
  const status = guest.lastDeliveryStatus ?? (guest.sentInviteMarked ? "sent" : undefined);

  if (!status || !guest.email) {
    return [];
  }

  const sentAt =
    guest.sentInviteAt ??
    guest.rsvpUpdatedAt ??
    guest.inviteOpenedAt ??
    new Date(0).toISOString();

  return [
    {
      id: `delivery_${guest.guestId}`,
      partyId: guest.guestId,
      channel: "email",
      kind: "invite",
      recipient: guest.email,
      subjectLine: `${eventTitle} invitation for ${labelForSheetGuest(guest)}`,
      bodyPreview: `Open your invitation: ${guest.inviteUrl}`,
      status,
      providerMessageId: guest.providerMessageId,
      sentAt,
      openedAt: guest.inviteOpenedAt,
      sandbox: status === "sandbox",
    },
  ];
}

function labelForSheetGuest(guest: SheetGuest) {
  return [guest.firstName, guest.lastName].filter(Boolean).join(" ").trim() || guest.email || "Guest";
}

function labelForName(firstName: string, lastName: string, email?: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || email || "Guest";
}

function tagsForSheetGuest(guest: SheetGuest) {
  return [
    guest.invitedByAle ? "invited_by_ale" : "",
    guest.invitedByBona ? "invited_by_bona" : "",
    guest.invitedByMum ? "invited_by_mum" : "",
    guest.willInviteToWalkingDinner ? "walking_dinner_invited" : "",
    guest.counted ? "counted" : "",
    guest.source ?? "",
  ].filter(Boolean);
}

function rowValuesFromRecord(
  headers: string[],
  record: Partial<Record<GuestSheetHeader, string>>,
) {
  return headers.map((header) => record[header as GuestSheetHeader] ?? "");
}

function splitGuestName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: name.trim(), lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

function createGuestId() {
  return `guest_${nanoid(12)}`;
}

function createGuestToken() {
  return `guest_${nanoid(18)}`;
}

function rangeFor(title: string, range: string) {
  return `${quoteSheetTitle(title)}!${range}`;
}

function quoteSheetTitle(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

function normalizeValues(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((row) =>
    Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [],
  );
}

function activityType(value: string): ActivityEvent["type"] {
  const allowed: ActivityEvent["type"][] = [
    "invite_opened",
    "rsvp_submitted",
    "delivery_created",
    "delivery_updated",
    "token_regenerated",
    "host_login",
    "content_updated",
    "guests_imported",
  ];

  return allowed.includes(value as ActivityEvent["type"])
    ? (value as ActivityEvent["type"])
    : "content_updated";
}
