import type {
  DeliveryStatus,
  PartyResponse,
  SaveRsvpInput,
} from "@/lib/types";

export const GUEST_SHEET_HEADERS = [
  "last_name",
  "first_name",
  "email",
  "guest_2_last_name",
  "guest_2_first_name",
  "display_name",
  "invited_by_ale",
  "invited_by_bona",
  "invited_by_mum",
  "counted",
  "source",
  "will_invite_to_walking_dinner",
  "sent_whatsapp_save_the_date",
  "sent_instagram_save_the_date",
  "spazio",
  "guest_id",
  "token",
  "token_active",
  "invite_url",
  "sent_invite_at",
  "invite_opened_at",
  "coming_to_walking_dinner",
  "coming_to_party",
  "guest_2_coming_to_party",
  "transfer_needed",
  "not_coming",
  "rsvp_note",
  "rsvp_updated_at",
  "last_delivery_status",
  "provider_message_id",
  "last_error",
  "admin_notes",
] as const;

export type GuestSheetHeader = (typeof GUEST_SHEET_HEADERS)[number];

export interface SheetGuest {
  rowNumber: number;
  guestId: string;
  token: string;
  tokenActive: boolean;
  tokenActiveExplicit: boolean;
  inviteUrl: string;
  lastName: string;
  firstName: string;
  email?: string;
  guest2LastName: string;
  guest2FirstName: string;
  displayName?: string;
  invitedByAle: boolean;
  invitedByBona: boolean;
  invitedByMum: boolean;
  counted: boolean;
  source?: string;
  sentWhatsappSaveTheDate: boolean;
  sentInstagramSaveTheDate: boolean;
  spazio?: string;
  willInviteToWalkingDinner: boolean;
  sentInviteAt?: string;
  sentInviteMarked: boolean;
  inviteOpenedAt?: string;
  comingToWalkingDinner: boolean;
  comingToParty: boolean;
  guest2ComingToParty: boolean;
  transferNeeded: boolean;
  notComing: boolean;
  rsvpNote: string;
  rsvpUpdatedAt?: string;
  lastDeliveryStatus?: DeliveryStatus;
  providerMessageId?: string;
  lastError?: string;
  adminNotes?: string;
  hasResponse: boolean;
}

export interface GuestSheetTable {
  headerRowIndex: number;
  headers: string[];
  columnMap: Partial<Record<GuestSheetHeader, number>>;
  guests: SheetGuest[];
  nextAppendRowNumber: number;
  needsHeaderUpdate: boolean;
}

export interface SheetColumnUpdate {
  header: GuestSheetHeader;
  value: string;
}

export interface SheetGuestMember {
  id: string;
  partyId: string;
  name: string;
  firstName: string;
  lastName: string;
  primary: boolean;
}

export interface SheetGuestSelectionIds {
  primaryGuestId: string;
  guest2Id?: string;
}

export interface GuestSheetIntegrityError {
  field: "guest_id" | "token";
  value: string;
  rows: number[];
}

export interface AddGuestInput {
  lastName: string;
  firstName: string;
  email?: string;
  guest2LastName?: string;
  guest2FirstName?: string;
  displayName?: string;
  invitedByAle: boolean;
  invitedByBona: boolean;
  invitedByMum: boolean;
  source?: string;
  willInviteToWalkingDinner: boolean;
  sentWhatsappSaveTheDate: boolean;
  sentInstagramSaveTheDate: boolean;
}

const FIELD_ALIASES: Partial<Record<GuestSheetHeader, string[]>> = {
  last_name: ["last name", "surname", "last"],
  first_name: ["name", "first name", "first"],
  guest_2_last_name: [
    "guest 2 last name",
    "second guest last name",
    "second last name",
    "partner last name",
    "spouse last name",
  ],
  guest_2_first_name: [
    "guest 2 first name",
    "second guest first name",
    "second first name",
    "partner first name",
    "spouse first name",
  ],
  display_name: ["display name", "party label", "invite label", "invitation name"],
  counted: ["invited", "invite", "count", "include", "active"],
  invited_by_ale: ["ale", "alessandro"],
  invited_by_bona: ["bona"],
  invited_by_mum: ["parents", "parent", "mum", "mom", "mother"],
  sent_whatsapp_save_the_date: [
    "sent whatsapp save the date",
    "whatsapp save the date",
  ],
  sent_instagram_save_the_date: [
    "sent instagram save the date",
    "instagram save the date",
  ],
  will_invite_to_walking_dinner: [
    "will invite to walking dinner",
    "invite to walking dinner",
    "invited to walking dinner",
  ],
  sent_invite_at: ["sent invite", "sent invitation", "invite sent"],
  invite_opened_at: ["opened invite", "invite opened"],
  coming_to_walking_dinner: ["coming to walking dinner", "walking dinner"],
  coming_to_party: ["coming to party", "party"],
  guest_2_coming_to_party: [
    "guest 2 coming to party",
    "second guest coming to party",
    "partner coming to party",
    "spouse coming to party",
  ],
  transfer_needed: ["transfer needed", "transfer"],
  not_coming: ["not coming", "declined"],
  rsvp_note: ["note", "notes", "private message"],
  rsvp_updated_at: ["rsvp updated", "rsvp updated at"],
  last_delivery_status: ["delivery status", "last delivery"],
  provider_message_id: ["provider message id", "message id"],
  admin_notes: ["admin notes"],
};

const LEGACY_COLUMN_INDEX: Partial<Record<GuestSheetHeader, number>> = {
  last_name: 0,
  first_name: 1,
  email: 2,
  invited_by_ale: 3,
  invited_by_bona: 4,
  invited_by_mum: 5,
  counted: 6,
  source: 7,
  sent_whatsapp_save_the_date: 8,
  sent_instagram_save_the_date: 9,
  spazio: 10,
  sent_invite_at: 11,
  coming_to_walking_dinner: 12,
  coming_to_party: 13,
  transfer_needed: 14,
  not_coming: 15,
};

const DELIVERY_STATUSES: DeliveryStatus[] = [
  "sandbox",
  "queued",
  "sent",
  "delivered",
  "opened",
  "failed",
];

export function normalizeHeaderName(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildInviteUrl(appUrl: string, token: string) {
  return `${appUrl.replace(/\/$/, "")}/i/${token}`;
}

export function columnLetter(index: number) {
  let column = "";
  let current = index + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - 1) / 26);
  }

  return column;
}

export function locateGuestHeaderRow(values: string[][]) {
  const maxHeaderSearchRows = Math.min(values.length, 10);

  for (let index = 0; index < maxHeaderSearchRows; index += 1) {
    const row = values[index] ?? [];
    const normalized = row.map((cell) => normalizeHeaderName(cell));
    const hasNormalizedId = normalized.includes("guest_id");
    const hasLegacyIdentity =
      normalized[0] === "last_name" &&
      (normalized[1] === "name" || normalized[1] === "first_name") &&
      normalized[2] === "email";

    if (hasNormalizedId || hasLegacyIdentity) {
      return index;
    }
  }

  return 0;
}

export function normalizeGuestHeaders(headers: string[]) {
  const nextHeaders = [...headers];
  const isLegacy = isLegacyHeaderRow(headers);
  const changedByAlias = normalizeAliases(nextHeaders);

  if (isLegacy) {
    for (const [header, index] of Object.entries(LEGACY_COLUMN_INDEX)) {
      nextHeaders[index] = header;
    }
  }

  const columnMap = buildColumnMap(nextHeaders, false);

  for (const header of GUEST_SHEET_HEADERS) {
    if (columnMap[header] === undefined) {
      columnMap[header] = nextHeaders.length;
      nextHeaders.push(header);
    }
  }

  const changed =
    changedByAlias ||
    nextHeaders.length !== headers.length ||
    nextHeaders.some((header, index) => header !== headers[index]);

  return {
    headers: nextHeaders,
    columnMap: buildColumnMap(nextHeaders, false),
    changed,
  };
}

export function parseGuestSheet(values: string[][], appUrl: string): GuestSheetTable {
  const headerRowIndex = locateGuestHeaderRow(values);
  const rawHeaders = values[headerRowIndex] ?? [];
  const normalized = normalizeGuestHeaders(rawHeaders);
  const rows = values.slice(headerRowIndex + 1);
  const lastValueRowIndex = values.reduce(
    (lastIndex, row, index) =>
      index > headerRowIndex && row.some((value) => String(value ?? "").trim() !== "")
        ? index
        : lastIndex,
    headerRowIndex,
  );

  const guests = rows
    .map((row, index) =>
      parseGuestRow(row, headerRowIndex + index + 2, normalized.columnMap, appUrl),
    )
    .filter((guest): guest is SheetGuest => guest !== null && guest.counted);

  return {
    headerRowIndex,
    headers: normalized.headers,
    columnMap: normalized.columnMap,
    guests,
    nextAppendRowNumber: Math.max(headerRowIndex + 2, lastValueRowIndex + 2),
    needsHeaderUpdate: normalized.changed,
  };
}

export function findGuestSheetIntegrityErrors(guests: SheetGuest[]) {
  return [
    ...findDuplicateValues(guests, "guest_id", (guest) => guest.guestId),
    ...findDuplicateValues(guests, "token", (guest) => guest.token),
  ];
}

export function buildRsvpColumnUpdates(
  input: SaveRsvpInput,
  timestamp = new Date().toISOString(),
  selectionIds?: SheetGuestSelectionIds,
): SheetColumnUpdate[] {
  const primaryAttending = selectionIds
    ? Boolean(input.selections[selectionIds.primaryGuestId])
    : Object.values(input.selections).some(Boolean);
  const guest2Attending = selectionIds?.guest2Id
    ? Boolean(input.selections[selectionIds.guest2Id])
    : false;
  const attending = primaryAttending || guest2Attending;
  const notComing = !attending;

  const updates: SheetColumnUpdate[] = [
    {
      header: "coming_to_walking_dinner",
      value: toSheetBoolean(!notComing && Boolean(input.answers.question_walking_dinner)),
    },
    {
      header: "coming_to_party",
      value: toSheetBoolean(!notComing && primaryAttending),
    },
    {
      header: "transfer_needed",
      value: toSheetBoolean(!notComing && Boolean(input.answers.question_transfer)),
    },
    { header: "not_coming", value: toSheetBoolean(notComing) },
    { header: "rsvp_note", value: input.note },
    { header: "rsvp_updated_at", value: timestamp },
    { header: "last_error", value: "" },
  ];

  if (selectionIds?.guest2Id) {
    updates.splice(2, 0, {
      header: "guest_2_coming_to_party",
      value: toSheetBoolean(!notComing && guest2Attending),
    });
  }

  return updates;
}

export function sheetGuestResponse(guest: SheetGuest): PartyResponse | undefined {
  if (!guest.hasResponse) {
    return undefined;
  }

  const guestSelections = Object.fromEntries(
    sheetGuestMembers(guest).map((member) => [
      member.id,
      !guest.notComing &&
        (member.primary ? guest.comingToParty : guest.guest2ComingToParty),
    ]),
  );
  const attending = Object.values(guestSelections).some(Boolean);

  return {
    status: attending ? "attending" : "not_attending",
    guestSelections,
    answers: {
      question_walking_dinner:
        attending && guest.willInviteToWalkingDinner && guest.comingToWalkingDinner,
      question_party: attending,
      question_transfer: attending && guest.transferNeeded,
    },
    note: guest.rsvpNote,
    updatedAt: guest.rsvpUpdatedAt ?? new Date(0).toISOString(),
  };
}

export function sheetGuestSelectionIds(guest: SheetGuest): SheetGuestSelectionIds {
  const members = sheetGuestMembers(guest);
  const primary = members.find((member) => member.primary);
  const guest2 = members.find((member) => !member.primary);

  return {
    primaryGuestId: primary?.id ?? guest.guestId,
    guest2Id: guest2?.id,
  };
}

export function sheetGuestMembers(guest: SheetGuest): SheetGuestMember[] {
  const hasGuest2 = Boolean(guest.guest2FirstName || guest.guest2LastName);
  const hasPrimary = Boolean(guest.firstName || guest.lastName || guest.email || !hasGuest2);
  const members: SheetGuestMember[] = [];

  if (hasPrimary) {
    members.push({
      id: guest.guestId,
      partyId: guest.guestId,
      name: labelForName(guest.firstName, guest.lastName, guest.email),
      firstName: guest.firstName,
      lastName: guest.lastName,
      primary: true,
    });
  }

  if (hasGuest2) {
    members.push({
      id: secondarySheetGuestId(guest.guestId),
      partyId: guest.guestId,
      name: labelForName(guest.guest2FirstName, guest.guest2LastName),
      firstName: guest.guest2FirstName,
      lastName: guest.guest2LastName,
      primary: false,
    });
  }

  return members;
}

export function labelForSheetGuest(guest: SheetGuest) {
  if (guest.displayName) {
    return guest.displayName;
  }

  const members = sheetGuestMembers(guest);
  if (members.length === 2) {
    const [primary, guest2] = members;
    const sharedLastName =
      primary.lastName &&
      guest2.lastName &&
      primary.lastName.toLocaleLowerCase() === guest2.lastName.toLocaleLowerCase();

    if (sharedLastName && primary.firstName && guest2.firstName) {
      return `${primary.firstName} e ${guest2.firstName} ${primary.lastName}`;
    }

    return `${primary.name} e ${guest2.name}`;
  }

  return members[0]?.name || guest.email || "Guest";
}

export function labelForName(firstName: string, lastName: string, email?: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || email || "Guest";
}

function secondarySheetGuestId(guestId: string) {
  return `${guestId}__guest_2`;
}

export function toSheetBoolean(value: boolean) {
  return value ? "TRUE" : "FALSE";
}

function normalizeAliases(headers: string[]) {
  let changed = false;
  const aliasMap = createAliasMap();

  headers.forEach((header, index) => {
    const normalized = normalizeHeaderName(header);
    const target = aliasMap.get(normalized);

    if (target && header !== target) {
      headers[index] = target;
      changed = true;
    }
  });

  return changed;
}

function buildColumnMap(headers: string[], allowLegacyFallback = true) {
  const aliasMap = createAliasMap();
  const columnMap: Partial<Record<GuestSheetHeader, number>> = {};

  headers.forEach((header, index) => {
    const normalized = normalizeHeaderName(header);
    const field = aliasMap.get(normalized);

    if (field && columnMap[field] === undefined) {
      columnMap[field] = index;
    }
  });

  if (allowLegacyFallback && isLegacyHeaderRow(headers)) {
    for (const [header, index] of Object.entries(LEGACY_COLUMN_INDEX)) {
      if (columnMap[header as GuestSheetHeader] === undefined) {
        columnMap[header as GuestSheetHeader] = index;
      }
    }
  }

  return columnMap;
}

function createAliasMap() {
  const aliases = new Map<string, GuestSheetHeader>();

  for (const header of GUEST_SHEET_HEADERS) {
    aliases.set(normalizeHeaderName(header), header);
    for (const alias of FIELD_ALIASES[header] ?? []) {
      aliases.set(normalizeHeaderName(alias), header);
    }
  }

  return aliases;
}

function isLegacyHeaderRow(headers: string[]) {
  const normalized = headers.map((header) => normalizeHeaderName(header));
  return (
    normalized[0] === "last_name" &&
    (normalized[1] === "name" || normalized[1] === "first_name") &&
    normalized[2] === "email" &&
    !normalized.includes("guest_id")
  );
}

function parseGuestRow(
  row: string[],
  rowNumber: number,
  columnMap: Partial<Record<GuestSheetHeader, number>>,
  appUrl: string,
): SheetGuest | null {
  const guestId = cell(row, columnMap, "guest_id");
  const token = cell(row, columnMap, "token");
  const tokenActiveValue = cell(row, columnMap, "token_active");
  const lastName = cell(row, columnMap, "last_name");
  const firstName = cell(row, columnMap, "first_name");
  const email = cell(row, columnMap, "email");
  const guest2LastName = cell(row, columnMap, "guest_2_last_name");
  const guest2FirstName = cell(row, columnMap, "guest_2_first_name");
  const displayName = cell(row, columnMap, "display_name");
  const rsvpNote = cell(row, columnMap, "rsvp_note");
  const rsvpUpdatedAt = cell(row, columnMap, "rsvp_updated_at");
  const comingToWalkingDinner = parseSheetBoolean(
    cell(row, columnMap, "coming_to_walking_dinner"),
  );
  const comingToParty = parseSheetBoolean(cell(row, columnMap, "coming_to_party"));
  const guest2ComingToParty = parseSheetBoolean(
    cell(row, columnMap, "guest_2_coming_to_party"),
  );
  const transferNeeded = parseSheetBoolean(cell(row, columnMap, "transfer_needed"));
  const notComing = parseSheetBoolean(cell(row, columnMap, "not_coming"));
  const sentInviteValue = cell(row, columnMap, "sent_invite_at");
  const countedValue = cell(row, columnMap, "counted");

  if (
    !guestId &&
    !token &&
    !lastName &&
    !firstName &&
    !email &&
    !guest2LastName &&
    !guest2FirstName &&
    !displayName
  ) {
    return null;
  }

  return {
    rowNumber,
    guestId,
    token,
    tokenActive: tokenActiveValue ? parseSheetBoolean(tokenActiveValue) : true,
    tokenActiveExplicit: Boolean(tokenActiveValue),
    inviteUrl: cell(row, columnMap, "invite_url") || (token ? buildInviteUrl(appUrl, token) : ""),
    lastName,
    firstName,
    email: email || undefined,
    guest2LastName,
    guest2FirstName,
    displayName: displayName || undefined,
    invitedByAle: parseSheetBoolean(cell(row, columnMap, "invited_by_ale")),
    invitedByBona: parseSheetBoolean(cell(row, columnMap, "invited_by_bona")),
    invitedByMum: parseSheetBoolean(cell(row, columnMap, "invited_by_mum")),
    counted: countedValue ? !parseSheetFalse(countedValue) : true,
    source: cell(row, columnMap, "source") || undefined,
    sentWhatsappSaveTheDate: parseSheetBoolean(
      cell(row, columnMap, "sent_whatsapp_save_the_date"),
    ),
    sentInstagramSaveTheDate: parseSheetBoolean(
      cell(row, columnMap, "sent_instagram_save_the_date"),
    ),
    spazio: cell(row, columnMap, "spazio") || undefined,
    willInviteToWalkingDinner: parseSheetBoolean(
      cell(row, columnMap, "will_invite_to_walking_dinner"),
    ),
    sentInviteAt: parseTimestampLike(sentInviteValue),
    sentInviteMarked: Boolean(parseTimestampLike(sentInviteValue)) || parseSheetBoolean(sentInviteValue),
    inviteOpenedAt: cell(row, columnMap, "invite_opened_at") || undefined,
    comingToWalkingDinner,
    comingToParty,
    guest2ComingToParty,
    transferNeeded,
    notComing,
    rsvpNote,
    rsvpUpdatedAt: rsvpUpdatedAt || undefined,
    lastDeliveryStatus: parseDeliveryStatus(cell(row, columnMap, "last_delivery_status")),
    providerMessageId: cell(row, columnMap, "provider_message_id") || undefined,
    lastError: cell(row, columnMap, "last_error") || undefined,
    adminNotes: cell(row, columnMap, "admin_notes") || undefined,
    hasResponse:
      Boolean(rsvpUpdatedAt || rsvpNote) ||
      notComing ||
      comingToWalkingDinner ||
      comingToParty ||
      guest2ComingToParty ||
      transferNeeded,
  } satisfies SheetGuest;
}

function cell(
  row: string[],
  columnMap: Partial<Record<GuestSheetHeader, number>>,
  header: GuestSheetHeader,
) {
  const index = columnMap[header];
  if (index === undefined) return "";
  return String(row[index] ?? "").trim();
}

function parseSheetBoolean(value: string) {
  const normalized = value.trim().toLowerCase();

  if (["true", "yes", "y", "1", "x", "si", "sì"].includes(normalized)) {
    return true;
  }

  return false;
}

function parseTimestampLike(value: string) {
  const normalized = value.trim();
  if (!normalized || parseSheetBoolean(normalized) || parseSheetFalse(normalized)) {
    return undefined;
  }
  return normalized;
}

function parseSheetFalse(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["false", "no", "n", "0"].includes(normalized);
}

function parseDeliveryStatus(value: string) {
  const normalized = normalizeHeaderName(value);
  return DELIVERY_STATUSES.find((status) => status === normalized);
}

function findDuplicateValues(
  guests: SheetGuest[],
  field: GuestSheetIntegrityError["field"],
  getValue: (guest: SheetGuest) => string,
) {
  const seen = new Map<string, number[]>();

  for (const guest of guests) {
    const value = getValue(guest);
    if (!value) continue;
    seen.set(value, [...(seen.get(value) ?? []), guest.rowNumber]);
  }

  return [...seen.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([value, rows]) => ({ field, value, rows }));
}
