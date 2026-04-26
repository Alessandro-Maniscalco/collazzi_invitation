import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const hostRoleEnum = pgEnum("host_role", ["owner", "editor"]);
export const deliveryChannelEnum = pgEnum("delivery_channel", ["email"]);
export const deliveryKindEnum = pgEnum("delivery_kind", ["invite", "reminder"]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "sandbox",
  "queued",
  "sent",
  "delivered",
  "opened",
  "failed",
]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "attending",
  "not_attending",
]);

export const events = pgTable("event", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  payload: jsonb("payload").notNull(),
  rsvpDeadline: timestamp("rsvp_deadline", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const hostUsers = pgTable("host_user", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: hostRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const parties = pgTable("party", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull(),
  label: text("label").notNull(),
  email: text("email"),
  tags: jsonb("tags").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const guests = pgTable("guest", {
  id: uuid("id").primaryKey(),
  partyId: uuid("party_id").notNull(),
  name: text("name").notNull(),
});

export const inviteTokens = pgTable("invite_token", {
  id: uuid("id").primaryKey(),
  partyId: uuid("party_id").notNull(),
  token: text("token").notNull(),
  active: boolean("active").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
});

export const questions = pgTable("question", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull(),
  label: text("label").notNull(),
  helpText: text("help_text"),
  kind: text("kind").notNull(),
});

export const responses = pgTable("response", {
  id: uuid("id").primaryKey(),
  partyId: uuid("party_id").notNull(),
  status: attendanceStatusEnum("status").notNull(),
  selections: jsonb("selections").notNull(),
  answers: jsonb("answers").notNull(),
  note: text("note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deliveries = pgTable("delivery", {
  id: uuid("id").primaryKey(),
  partyId: uuid("party_id").notNull(),
  channel: deliveryChannelEnum("channel").notNull(),
  kind: deliveryKindEnum("kind").notNull(),
  recipient: text("recipient").notNull(),
  subjectLine: text("subject_line").notNull(),
  bodyPreview: text("body_preview").notNull(),
  status: deliveryStatusEnum("status").notNull(),
  providerMessageId: text("provider_message_id"),
  sandbox: boolean("sandbox").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
});

export const itineraryItems = pgTable("itinerary_item", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull(),
  payload: jsonb("payload").notNull(),
});

export const accommodationCards = pgTable("accommodation_card", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull(),
  payload: jsonb("payload").notNull(),
});

export const messageTemplates = pgTable("message_template", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull(),
  channel: deliveryChannelEnum("channel").notNull(),
  kind: deliveryKindEnum("kind").notNull(),
  subjectLine: text("subject_line"),
  body: text("body").notNull(),
});

export const activityEvents = pgTable("activity_event", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull(),
  kind: text("kind").notNull(),
  actor: text("actor").notNull(),
  message: text("message").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
