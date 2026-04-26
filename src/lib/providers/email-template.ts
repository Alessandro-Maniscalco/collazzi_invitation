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

const DEFAULT_CARD_IMAGE = "/assets/collazzi/invito-save-date.jpg";
const DEFAULT_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Villa+I+Collazzi+Scandicci";

export function renderInvitationEmail(input: InvitationEmailInput): InvitationEmail {
  const coupleName = "Bona and Alessandro";
  const cardUrl = absoluteUrl(input.appUrl, input.heroImageSrc || DEFAULT_CARD_IMAGE);
  const dateParts = splitDateLabel(input.summaryDateLabel);
  const addressName = input.summaryAddressName || "Villa I Collazzi";
  const addressLabel = input.summaryAddressLabel || "Scandicci (Firenze), Italia";
  const mapUrl = input.mapUrl || DEFAULT_MAP_URL;
  const rsvpLabel = formatRsvpDeadline(input.rsvpDeadline);
  const isReminder = input.kind === "reminder";
  const subjectLine = isReminder
    ? `Reminder: ${input.eventTitle}`
    : `${input.eventTitle} invitation`;
  const bodyPreview = isReminder
    ? `Reminder to RSVP for ${input.eventTitle}: ${input.inviteUrl}`
    : `Open your private invitation: ${input.inviteUrl}`;

  const html = `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subjectLine)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fefbf6;color:#333333;">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${escapeHtml(bodyPreview)}
    </div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fefbf6;">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#fefbf6;">
            <tr>
              <td align="center" style="padding:28px 20px 16px;">
                <div style="font-family:Georgia,serif;font-size:25px;line-height:30px;color:#2f2721;">
                  ${escapeHtml(coupleName)}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px 14px;">
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:#333333;">
                  For: ${escapeHtml(input.partyLabel)}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px 24px;">
                <a href="${escapeAttribute(input.inviteUrl)}" target="_blank" style="display:inline-block;border-bottom:1px solid #333333;color:#333333;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2.6px;line-height:20px;text-decoration:none;text-transform:uppercase;">
                  VIEW THE CARD
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 14px 28px;">
                <a href="${escapeAttribute(input.inviteUrl)}" target="_blank" style="text-decoration:none;">
                  <img alt="Event Invitation" src="${escapeAttribute(cardUrl)}" width="612" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;max-width:612px;" />
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px;">
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:#333333;">${escapeHtml(dateParts.date)}</div>
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:#333333;">${escapeHtml(dateParts.time)}</div>
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:#333333;padding-top:8px;">
                  <a href="${escapeAttribute(calendarUrl(input))}" target="_blank" style="color:#333333;text-decoration:underline;">Add to calendar</a>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:30px 40px 26px;">
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:#333333;">
                  Please RSVP before ${escapeHtml(rsvpLabel)}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px;">
                <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:bold;line-height:28px;color:#333333;">${escapeHtml(addressName)}</div>
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:#333333;">${escapeHtml(addressLabel)}</div>
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:#333333;padding-top:8px;">
                  <a href="${escapeAttribute(mapUrl)}" target="_blank" style="color:#333333;text-decoration:underline;">View map</a>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:32px 40px 38px;">
                <div style="font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#7b7066;">
                  This private link is for ${escapeHtml(input.partyLabel)}.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    coupleName,
    "",
    `For: ${input.partyLabel}`,
    "",
    isReminder ? "Reminder to view the card and RSVP:" : "View the card:",
    input.inviteUrl,
    "",
    dateParts.date,
    dateParts.time,
    "",
    `Please RSVP before ${rsvpLabel}`,
    "",
    addressName,
    addressLabel,
    mapUrl,
    "",
    `This private link is for ${input.partyLabel}.`,
  ].join("\n");

  return {
    subjectLine,
    bodyPreview,
    text,
    html,
  };
}

function absoluteUrl(appUrl: string, pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${appUrl.replace(/\/$/, "")}/${pathOrUrl.replace(/^\//, "")}`;
}

function splitDateLabel(label?: string) {
  if (!label) {
    return {
      date: "Friday, August 28",
      time: "7:30PM CET",
    };
  }

  const mainEvent = label
    .split(/\s+[–-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1) ?? label;
  const match = mainEvent.match(/^(.*?),?\s+(\d{1,2}:\d{2}\s*[AP]M.*)$/i);

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

function formatRsvpDeadline(value?: string) {
  if (!value) {
    return "June 15th";
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

function calendarUrl(input: InvitationEmailInput) {
  const title = encodeURIComponent(input.eventTitle);
  const details = encodeURIComponent(`Open your private invitation: ${input.inviteUrl}`);
  const location = encodeURIComponent(
    [input.summaryAddressName, input.summaryAddressLabel].filter(Boolean).join(", "),
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
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
