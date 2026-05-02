import type { DeliveryKind } from "@/lib/types";

export interface InvitationEmailInput {
  appUrl: string;
  inviteUrl: string;
  partyLabel: string;
  eventTitle: string;
  kind: DeliveryKind;
  summaryDateLabel?: string;
  summaryAddressName?: string;
  summaryAddressLabel?: string;
  rsvpDeadline?: string;
  heroImageSrc?: string;
  mapUrl?: string;
}

export interface InvitationEmail {
  subjectLine: string;
  bodyPreview: string;
  text: string;
  html: string;
}

const TEXT_COLOR = "#2f2721";
const COUPLE_NAME = "Bona and Alessandro";

export function renderInvitationEmail(input: InvitationEmailInput): InvitationEmail {
  const dateParts = splitDateLabel(input.summaryDateLabel);
  const eventLine = formatEventLine(dateParts, input.summaryAddressName);
  const rsvpLabel = formatRsvpDeadline(input.rsvpDeadline);
  const greetingName = greetingNameForLabel(input.partyLabel);
  const isReminder = input.kind === "reminder";
  const subjectLine = isReminder
    ? `Reminder: ${COUPLE_NAME} - invitation for ${input.partyLabel}`
    : `${COUPLE_NAME} - invitation for ${input.partyLabel}`;
  const bodyPreview = isReminder
    ? `Reminder to RSVP for ${COUPLE_NAME}.`
    : `Here is the invitation link for ${input.partyLabel}.`;

  const html = `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subjectLine)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;color:${TEXT_COLOR};">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${escapeHtml(bodyPreview)}
    </div>
    <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:400;line-height:24px;color:${TEXT_COLOR};text-align:left;">
      <p style="margin:0 0 18px;">Hi ${escapeHtml(greetingName)},</p>
      <p style="margin:0 0 18px;">Here is your invitation link: <a href="${escapeAttribute(input.inviteUrl)}" target="_blank" style="color:${TEXT_COLOR};text-decoration:underline;">${escapeHtml(input.inviteUrl)}</a>!</p>
      <p style="margin:0 0 18px;">${escapeHtml(eventLine)}</p>
      <p style="margin:0 0 18px;">Please RSVP by ${escapeHtml(rsvpLabel)}.</p>
      <p style="margin:0;">Best,<br />${escapeHtml(COUPLE_NAME)}</p>
    </div>
  </body>
</html>`;

  const text = [
    `Hi ${greetingName},`,
    "",
    `Here is your invitation link: ${input.inviteUrl}!`,
    "",
    eventLine,
    "",
    `Please RSVP by ${rsvpLabel}.`,
    "",
    "Best,",
    COUPLE_NAME,
  ].join("\n");

  return {
    subjectLine,
    bodyPreview,
    text,
    html,
  };
}

function greetingNameForLabel(label: string) {
  const normalized = label.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "there";
  }

  const connectorMatch = normalized.match(/\s+(e|and|&)\s+/i);
  if (!connectorMatch) {
    return firstGivenName(normalized);
  }

  const connector = connectorMatch[1];
  return normalized
    .split(new RegExp(`\\s+${escapeRegExp(connector)}\\s+`, "i"))
    .map(firstGivenName)
    .filter(Boolean)
    .join(` ${connector} `);
}

function firstGivenName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitDateLabel(label?: string) {
  if (!label) {
    return {
      date: "Friday, August 28th",
      time: "19h30",
    };
  }

  const mainEvent = label
    .split(/\s+[–-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1) ?? label;
  const match = mainEvent.match(
    /^(.*?),?\s+(\d{1,2}:\d{2}\s*[AP]M.*|\d{1,2}h\d{2}(?:\s*\w+)?)$/i,
  );

  if (!match) {
    return {
      date: mainEvent,
      time: "",
    };
  }

  return {
    date: match[1].trim(),
    time: match[2].replace(/\s+/g, " ").trim(),
  };
}

function formatEventLine(
  dateParts: {
    date: string;
    time: string;
  },
  addressName?: string,
) {
  const date = /\b\d{4}\b/.test(dateParts.date) ? dateParts.date : `${dateParts.date}, 2026`;
  const time = dateParts.time.replace(/^(\d{1,2})h(\d{2})$/i, "$1:$2");
  const dateTime = [date, time].filter(Boolean).join(", ");
  const venue = addressName || "Villa I Collazzi";

  return `${dateTime}. ${venue}, Florence.`;
}

function formatRsvpDeadline(value?: string) {
  if (!value) {
    return "July 15th";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = new Intl.DateTimeFormat("en", { month: "long", timeZone: "Europe/Rome" }).format(
    date,
  );
  const day = Number(new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "Europe/Rome" }).format(date));
  return `${month} ${day}${ordinal(day)}`;
}

function ordinal(day: number) {
  if (day >= 11 && day <= 13) {
    return "th";
  }

  const last = day % 10;
  if (last === 1) return "st";
  if (last === 2) return "nd";
  if (last === 3) return "rd";
  return "th";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
