import { format, formatDistanceToNowStrict, isPast, parseISO } from "date-fns";

import type {
  DashboardSnapshot,
  DeliveryRecord,
  DeliveryStatus,
  Guest,
  Party,
} from "@/lib/types";

export function cn(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(" ");
}

export function formatDeadline(deadline: string) {
  return format(parseISO(deadline), "MMMM d, yyyy");
}

export function formatTimestamp(value?: string) {
  if (!value) return "Never";
  return format(parseISO(value), "MMM d, yyyy 'at' h:mmaaa");
}

export function formatRelative(value?: string) {
  if (!value) return "Never";
  return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
}

export function isReadOnly(deadline: string) {
  return isPast(parseISO(deadline));
}

export function partyAttendanceSummary(party: Party, guests: Guest[]) {
  const response = party.response;
  if (!response) return "Awaiting RSVP";

  const confirmed = guests.filter((guest) => response.guestSelections[guest.id]);
  if (confirmed.length === 0) return "Not attending";
  if (confirmed.length === guests.length) return "Everyone attending";
  return `${confirmed.length} of ${guests.length} attending`;
}

export function deliveryStatusTone(status: DeliveryStatus) {
  switch (status) {
    case "opened":
      return "text-emerald-700";
    case "delivered":
      return "text-sky-700";
    case "sent":
    case "queued":
      return "text-amber-700";
    case "failed":
      return "text-rose-700";
    default:
      return "text-stone-700";
  }
}

export function latestDelivery(deliveries: DeliveryRecord[]) {
  return deliveries
    .slice()
    .sort((left, right) => right.sentAt.localeCompare(left.sentAt))[0];
}

export function dashboardPreviewLinks(snapshot: DashboardSnapshot) {
  return snapshot.parties.slice(0, 3).map((party) => ({
    label: party.label,
    href: `/i/${party.token.value}`,
  }));
}
