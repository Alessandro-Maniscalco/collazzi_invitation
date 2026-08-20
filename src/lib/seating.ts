import type { GuestSheetHeader, SheetGuest } from "@/lib/sheets/guest-sheet";

export const SEATING_TABLE_COUNT = 15;
export const SEATS_PER_TABLE = 10;
export const SEATING_SOURCE = "Diana";

export type SeatingMember = "guest_1" | "guest_2";

export interface SeatingTable {
  id: number;
  name: string;
}

export interface SeatingGuest {
  id: string;
  partyId: string;
  member: SeatingMember;
  firstName: string;
  lastName: string;
  checkedIn: boolean;
  tableId?: number;
  seatPosition?: number;
}

export interface SeatingSnapshot {
  tables: SeatingTable[];
  guests: SeatingGuest[];
}

export type SeatingMoveMode = "move" | "switch" | "drop";

export interface SeatingMove {
  guestId: string;
  targetTableId?: number;
  targetSeatPosition?: number;
  mode: SeatingMoveMode;
}

export interface SeatingSheetUpdate {
  rowNumber: number;
  updates: Array<{ header: GuestSheetHeader; value: string }>;
}

export function seatingGuestId(partyId: string, member: SeatingMember) {
  return `${partyId}:${member}`;
}

export function seatingGuestsFromSheet(guests: SheetGuest[]) {
  const seatingGuests = guests
    .filter((guest) => guest.source?.trim().toLocaleLowerCase() === SEATING_SOURCE.toLocaleLowerCase())
    .flatMap((guest) => {
      const members: SeatingGuest[] = [];
      const primaryTableId = parseTableId(guest.primaryTableName);
      const guest2TableId = parseTableId(guest.guest2TableName);

      if ((guest.firstName || guest.lastName) && guest.comingToParty) {
        members.push({
          id: seatingGuestId(guest.guestId, "guest_1"),
          partyId: guest.guestId,
          member: "guest_1",
          firstName: guest.firstName,
          lastName: guest.lastName,
          checkedIn: guest.primaryCheckedIn,
          tableId: validPlacement(primaryTableId, guest.primarySeatPosition)
            ? primaryTableId
            : undefined,
          seatPosition: validPlacement(primaryTableId, guest.primarySeatPosition)
            ? guest.primarySeatPosition
            : undefined,
        });
      }

      if ((guest.guest2FirstName || guest.guest2LastName) && guest.guest2ComingToParty) {
        members.push({
          id: seatingGuestId(guest.guestId, "guest_2"),
          partyId: guest.guestId,
          member: "guest_2",
          firstName: guest.guest2FirstName,
          lastName: guest.guest2LastName,
          checkedIn: guest.guest2CheckedIn,
          tableId: validPlacement(guest2TableId, guest.guest2SeatPosition)
            ? guest2TableId
            : undefined,
          seatPosition: validPlacement(guest2TableId, guest.guest2SeatPosition)
            ? guest.guest2SeatPosition
            : undefined,
        });
      }

      return members;
    });

  const occupied = new Set<string>();
  return seatingGuests.map((guest) => {
    if (!guest.tableId || !guest.seatPosition) return guest;
    const seatKey = `${guest.tableId}:${guest.seatPosition}`;
    if (occupied.has(seatKey)) {
      return { ...guest, tableId: undefined, seatPosition: undefined };
    }
    occupied.add(seatKey);
    return guest;
  });
}

export function sortSeatingGuests(guests: SeatingGuest[]) {
  return [...guests].sort((left, right) => {
    const lastNameOrder = (left.lastName || left.firstName).localeCompare(
      right.lastName || right.firstName,
      undefined,
      { sensitivity: "base" },
    );
    if (lastNameOrder) return lastNameOrder;
    return left.firstName.localeCompare(right.firstName, undefined, { sensitivity: "base" });
  });
}

export function guestAtSeat(
  guests: SeatingGuest[],
  tableId: number,
  seatPosition: number,
) {
  return guests.find(
    (guest) => guest.tableId === tableId && guest.seatPosition === seatPosition,
  );
}

export function applySeatingMove(guests: SeatingGuest[], move: SeatingMove) {
  const selected = guests.find((guest) => guest.id === move.guestId);
  if (!selected) throw new Error("The selected guest is no longer available.");

  const hasTarget = move.targetTableId !== undefined || move.targetSeatPosition !== undefined;
  if (
    hasTarget &&
    (!validTableId(move.targetTableId) || !validSeatPosition(move.targetSeatPosition))
  ) {
    throw new Error("The destination seat is invalid.");
  }

  if (!hasTarget) {
    return guests.map((guest) =>
      guest.id === selected.id
        ? { ...guest, tableId: undefined, seatPosition: undefined }
        : guest,
    );
  }

  const targetTableId = move.targetTableId as number;
  const targetSeatPosition = move.targetSeatPosition as number;
  const displaced = guestAtSeat(guests, targetTableId, targetSeatPosition);

  if (displaced?.id === selected.id) return guests;
  if (displaced && move.mode === "move") {
    throw new Error("Choose whether to switch the guests or unseat the destination guest.");
  }

  return guests.map((guest) => {
    if (guest.id === selected.id) {
      return { ...guest, tableId: targetTableId, seatPosition: targetSeatPosition };
    }
    if (displaced && guest.id === displaced.id) {
      if (move.mode === "switch" && selected.tableId && selected.seatPosition) {
        return {
          ...guest,
          tableId: selected.tableId,
          seatPosition: selected.seatPosition,
        };
      }
      return { ...guest, tableId: undefined, seatPosition: undefined };
    }
    return guest;
  });
}

export function seatingUpdatesForGuest(
  sheetGuest: SheetGuest,
  seatingGuest: SeatingGuest,
): SeatingSheetUpdate {
  const primary = seatingGuest.member === "guest_1";
  return {
    rowNumber: sheetGuest.rowNumber,
    updates: [
      {
        header: primary ? "Tavolo guest 1" : "Tavoli guest 2",
        value: seatingGuest.tableId ? String(seatingGuest.tableId) : "",
      },
      {
        header: primary ? "Position guest 1" : "Position guest 2",
        value: seatingGuest.seatPosition ? String(seatingGuest.seatPosition) : "",
      },
    ],
  };
}

export function validTableId(value: number | undefined): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= SEATING_TABLE_COUNT;
}

export function validSeatPosition(value: number | undefined): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= SEATS_PER_TABLE;
}

function parseTableId(value: string | undefined) {
  if (!value) return undefined;
  const match = value.match(/\d+/);
  const tableId = match ? Number(match[0]) : undefined;
  return validTableId(tableId) ? tableId : undefined;
}

function validPlacement(tableId: number | undefined, position: number | undefined) {
  return validTableId(tableId) && validSeatPosition(position);
}
