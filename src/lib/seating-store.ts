import { hasGoogleSheetsConfig } from "@/lib/env";
import { getGoogleSheetsGuestStore } from "@/lib/sheets/google-store";
import {
  SEATING_TABLE_COUNT,
  applySeatingMove,
  seatingGuestsFromSheet,
  seatingUpdatesForGuest,
  validTableId,
  type SeatingMove,
  type SeatingSnapshot,
  type SeatingTable,
} from "@/lib/seating";

declare global {
  var __collazzi_seating_tables: SeatingTable[] | undefined;
}

function defaultTables() {
  return Array.from({ length: SEATING_TABLE_COUNT }, (_, index) => ({
    id: index + 1,
    name: `Table ${index + 1}`,
  }));
}

function localTables() {
  globalThis.__collazzi_seating_tables ??= defaultTables();
  return globalThis.__collazzi_seating_tables;
}

export async function getSeatingSnapshot(): Promise<SeatingSnapshot> {
  if (!hasGoogleSheetsConfig()) {
    return { tables: localTables(), guests: [] };
  }

  const store = getGoogleSheetsGuestStore();
  const [{ table }, tables] = await Promise.all([
    store.loadGuests(),
    store.loadSeatingTableNames(),
  ]);
  return { tables, guests: seatingGuestsFromSheet(table.guests) };
}

export async function moveSeatingGuest(move: SeatingMove): Promise<SeatingSnapshot> {
  if (!hasGoogleSheetsConfig()) {
    throw new Error("Google Sheets must be configured to save seating changes.");
  }

  const store = getGoogleSheetsGuestStore();
  const [{ table }, tables] = await Promise.all([
    store.loadGuests(),
    store.loadSeatingTableNames(),
  ]);
  const currentGuests = seatingGuestsFromSheet(table.guests);
  const nextGuests = applySeatingMove(currentGuests, move);
  const changedGuests = nextGuests.filter((guest) => {
    const previous = currentGuests.find((candidate) => candidate.id === guest.id);
    return (
      previous?.tableId !== guest.tableId ||
      previous?.seatPosition !== guest.seatPosition
    );
  });
  const sheetGuestsById = new Map(table.guests.map((guest) => [guest.guestId, guest]));

  await store.writeGuestColumnBatches(
    table,
    changedGuests.map((guest) => {
      const sheetGuest = sheetGuestsById.get(guest.partyId);
      if (!sheetGuest) throw new Error("The guest row is no longer available.");
      return seatingUpdatesForGuest(sheetGuest, guest);
    }),
  );

  return { tables, guests: nextGuests };
}

export async function renameSeatingTable(tableId: number, name: string) {
  const normalizedName = name.trim();
  if (!validTableId(tableId)) throw new Error("The table number is invalid.");
  if (!normalizedName || normalizedName.length > 80) {
    throw new Error("The table name must contain between 1 and 80 characters.");
  }

  if (!hasGoogleSheetsConfig()) {
    globalThis.__collazzi_seating_tables = localTables().map((table) =>
      table.id === tableId ? { ...table, name: normalizedName } : table,
    );
    return { id: tableId, name: normalizedName };
  }

  await getGoogleSheetsGuestStore().renameSeatingTable(tableId, normalizedName);
  return { id: tableId, name: normalizedName };
}
