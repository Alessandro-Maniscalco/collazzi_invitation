import type { CheckInGuest } from "@/lib/types";

export function normalizeGuestSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function guestMatchesSearch(guest: CheckInGuest, query: string) {
  const queryTokens = normalizeGuestSearch(query).split(" ").filter(Boolean);
  if (!queryTokens.length) return false;

  const nameTokens = normalizeGuestSearch(guest.name).split(" ").filter(Boolean);
  return queryTokens.every((queryToken) =>
    nameTokens.some((nameToken) => nameToken.includes(queryToken)),
  );
}

export function searchCheckInGuests(guests: CheckInGuest[], query: string) {
  return guests
    .filter((guest) => guestMatchesSearch(guest, query))
    .sort((left, right) => left.name.localeCompare(right.name));
}
