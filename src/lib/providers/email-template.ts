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

const BORDEAUX = "#660033";
const TEXT_COLOR = "#2f2721";
const CARD_TEXT_COLOR = "#fbf0dc";
const POSTMARK_COLOR = "#d9c3a9";

export function renderInvitationEmail(input: InvitationEmailInput): InvitationEmail {
  const coupleName = "Bona and Alessandro Maniscalco";
  const inviteDomain = domainFromUrl(input.inviteUrl);
  const dateParts = splitDateLabel(input.summaryDateLabel);
  const dateLine = [dateParts.date, dateParts.time].filter(Boolean).join(", ");
  const timeLineHtml = dateParts.time
    ? `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:${TEXT_COLOR};">${escapeHtml(dateParts.time)}</div>`
    : "";
  const addressName = input.summaryAddressName || "Villa I Collazzi";
  const addressLabel = input.summaryAddressLabel || "Scandicci (Firenze), Italia";
  const rsvpLabel = formatRsvpDeadline(input.rsvpDeadline);
  const isReminder = input.kind === "reminder";
  const subjectLine = isReminder
    ? `Reminder: ${input.eventTitle}`
    : `${input.eventTitle} invitation`;
  const bodyPreview = isReminder
    ? `Reminder to RSVP for ${input.eventTitle}.`
    : `Private invitation for ${input.partyLabel}.`;

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
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#ffffff;">
            <tr>
              <td align="center" style="padding:28px 20px 24px;">
                <div style="font-family:Georgia,serif;font-size:24px;line-height:28px;color:${TEXT_COLOR};">
                  ${escapeHtml(coupleName)}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 60px 24px;">
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:${TEXT_COLOR};">
                  For: ${escapeHtml(input.partyLabel)}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 60px 20px;">
                <a href="${escapeAttribute(input.inviteUrl)}" target="_blank" style="display:inline-block;border-bottom:1px solid ${TEXT_COLOR};color:${TEXT_COLOR};font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2.6px;line-height:20px;text-decoration:none;text-transform:uppercase;">
                  OPEN INVITATION ON ${escapeHtml(inviteDomain.toUpperCase())}
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 16px 30px;">
                ${renderEnvelopeCard(input.partyLabel)}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px;">
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:${TEXT_COLOR};">${escapeHtml(dateParts.date)}</div>
                ${timeLineHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:30px 40px 26px;">
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:${TEXT_COLOR};">
                  Please RSVP before ${escapeHtml(rsvpLabel)}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px;">
                <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:bold;line-height:28px;color:${TEXT_COLOR};">${escapeHtml(addressName)}</div>
                <div style="font-family:Arial,sans-serif;font-size:16px;line-height:24px;color:${TEXT_COLOR};">${escapeHtml(addressLabel)}</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:32px 40px 38px;">
                <div style="font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#6f625b;">
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
    isReminder ? "Reminder to view the invitation and RSVP:" : "Open the invitation:",
    input.inviteUrl,
    "",
    dateLine,
    "",
    `Please RSVP before ${rsvpLabel}`,
    "",
    addressName,
    addressLabel,
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

function domainFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "bonaalessandro.ink";
  }
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

function renderEnvelopeCard(partyLabel: string) {
  const escapedLabel = escapeHtml(partyLabel);

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="604" height="360" style="border-collapse:collapse;width:100%;max-width:604px;height:360px;background:${BORDEAUX};border:0;">
                    <tr>
                      <td align="right" valign="top" style="height:92px;padding:22px 22px 0 22px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="116" height="116" style="border-collapse:collapse;width:116px;height:116px;background:#f7ead6;border:6px solid #f7ead6;">
                          <tr>
                            <td align="center" valign="middle" style="border:2px solid ${POSTMARK_COLOR};font-family:Georgia,'Times New Roman',serif;color:${BORDEAUX};font-size:16px;line-height:20px;">
                              <div>Maniscalco's</div>
                              <div style="font-size:38px;line-height:38px;font-style:italic;">Post</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" valign="middle" style="height:120px;padding:0 54px;">
                        <div style="font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:46px;font-weight:normal;color:${CARD_TEXT_COLOR};text-align:center;text-decoration:none;">
                          ${escapedLabel}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="height:148px;font-size:1px;line-height:1px;">&nbsp;</td>
                    </tr>
                  </table>`;
}

function formatRsvpDeadline(value?: string) {
  if (!value) {
    return "July 28th";
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
