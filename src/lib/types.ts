export type HostRole = "owner" | "editor";
export type DeliveryChannel = "email";
export type DeliveryKind = "invite" | "reminder";
export type DeliveryStatus =
  | "sandbox"
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "failed";
export type AttendanceStatus = "attending" | "not_attending";
export type QuestionType = "checkbox";
export type ActivityType =
  | "invite_opened"
  | "rsvp_submitted"
  | "delivery_created"
  | "delivery_updated"
  | "token_regenerated"
  | "host_login"
  | "content_updated"
  | "guests_imported";

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  heroMonogram: string;
  heroImageSrc: string;
  heroBackImageSrc: string;
  heroBackdropSrc: string;
  paperTextureSrc: string;
  summaryName: string;
  summaryDateLabel: string;
  summaryAddressName: string;
  summaryAddressLabel: string;
  introduction: string;
  dressCode: string;
  rsvpDeadline: string;
  footerNote: string;
}

export interface HostUser {
  id: string;
  name: string;
  email: string;
  role: HostRole;
  lastLoginAt?: string;
}

export interface Guest {
  id: string;
  partyId: string;
  name: string;
}

export interface InviteToken {
  value: string;
  active: boolean;
  expiresAt?: string;
  openedAt?: string;
}

export interface PartyResponse {
  status: AttendanceStatus;
  guestSelections: Record<string, boolean>;
  answers: Record<string, boolean>;
  note: string;
  updatedAt: string;
}

export interface Party {
  id: string;
  label: string;
  guestIds: string[];
  email?: string;
  notes?: string;
  tags: string[];
  token: InviteToken;
  response?: PartyResponse;
  deliveryIds: string[];
  lastSentAt?: string;
}

export interface Question {
  id: string;
  label: string;
  helpText?: string;
  type: QuestionType;
}

export interface ItinerarySubItem {
  id: string;
  label?: string;
  venueName?: string;
  address?: string;
  mapUrl?: string;
  note?: string;
}

export interface ItineraryItem {
  id: string;
  dayLabel: string;
  venueName: string;
  address: string;
  mapUrl: string;
  title: string;
  datetimeLabel: string;
  dressCode: string;
  description: string;
  imageSrc: string;
  note?: string;
  subItems?: ItinerarySubItem[];
}

export interface AccommodationCard {
  id: string;
  title: string;
  city: string;
  address: string;
  addressLines?: string[];
  phone: string;
  ctaLabel: string;
  ctaUrl: string;
  imageSrc: string;
  notes: string;
}

export interface DeliveryRecord {
  id: string;
  partyId: string;
  channel: DeliveryChannel;
  kind: DeliveryKind;
  recipient: string;
  subjectLine: string;
  bodyPreview: string;
  status: DeliveryStatus;
  providerMessageId?: string;
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  sandbox: boolean;
}

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  createdAt: string;
  actor: string;
  message: string;
}

export interface AppState {
  event: EventRecord;
  hosts: HostUser[];
  questions: Question[];
  itinerary: ItineraryItem[];
  accommodations: AccommodationCard[];
  parties: Party[];
  guests: Guest[];
  deliveries: DeliveryRecord[];
  activities: ActivityEvent[];
}

export interface InvitationView {
  event: EventRecord;
  party: Party;
  guests: Guest[];
  questions: Question[];
  itinerary: ItineraryItem[];
  accommodations: AccommodationCard[];
  deliveries: DeliveryRecord[];
  readOnly: boolean;
}

export interface DashboardSnapshot {
  event: EventRecord;
  hosts: HostUser[];
  questions: Question[];
  itinerary: ItineraryItem[];
  accommodations: AccommodationCard[];
  parties: Array<
    Party & {
      guests: Guest[];
      deliveries: DeliveryRecord[];
    }
  >;
  stats: {
    invitedParties: number;
    deliveredMessages: number;
    openedInvites: number;
    attendingGuests: number;
    declinedGuests: number;
    pendingParties: number;
  };
  activities: ActivityEvent[];
}

export interface SaveRsvpInput {
  token: string;
  selections: Record<string, boolean>;
  answers: Record<string, boolean>;
  note: string;
}

export interface SendBatchInput {
  partyIds?: string[];
  channels: DeliveryChannel[];
  kind: DeliveryKind;
  filter?: "all" | "awaiting_response" | "attending" | "not_attending";
}

export interface HostContentUpdate {
  event: EventRecord;
  questions: Question[];
  itinerary: ItineraryItem[];
  accommodations: AccommodationCard[];
}
